/**
 * State Module - SQLite persistence for agent state
 */

import Database from "better-sqlite3";
import path from "node:path";
import { getAgentDataDir, ensureDataDir } from "../platform/index.js";

export interface AgentState {
  id: string;
  status: "running" | "idle" | "thinking" | "acting" | "error" | "sleeping";
  currentTask: string | null;
  credits: number;
  totalEarned: number;
  totalSpent: number;
  loopCount: number;
  lastActive: string;
  createdAt: string;
}

export interface ThoughtLog {
  id: number;
  timestamp: string;
  type: string;
  input: string;
  output: string;
  duration: number;
}

export interface TaskRecord {
  id: string;
  type: string;
  description: string;
  status: "pending" | "active" | "completed" | "failed";
  reward: number;
  createdAt: string;
  completedAt: string | null;
}

export class StateDatabase {
  private db: Database.Database;

  constructor() {
    ensureDataDir();
    const dbPath = path.join(getAgentDataDir(), "automaton.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_state (
        id TEXT PRIMARY KEY DEFAULT 'main',
        status TEXT DEFAULT 'idle',
        current_task TEXT,
        credits REAL DEFAULT 0,
        total_earned REAL DEFAULT 0,
        total_spent REAL DEFAULT 0,
        loop_count INTEGER DEFAULT 0,
        last_active TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS thought_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT (datetime('now')),
        type TEXT NOT NULL,
        input TEXT NOT NULL,
        output TEXT NOT NULL,
        duration INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reward REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS earnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        amount REAL NOT NULL,
        source TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO agent_state (id) VALUES ('main');
    `);
  }

  // --- Agent State ---

  getState(): AgentState {
    const row = this.db.prepare("SELECT * FROM agent_state WHERE id = 'main'").get() as any;
    return {
      id: row.id,
      status: row.status,
      currentTask: row.current_task,
      credits: row.credits,
      totalEarned: row.total_earned,
      totalSpent: row.total_spent,
      loopCount: row.loop_count,
      lastActive: row.last_active,
      createdAt: row.created_at,
    };
  }

  updateStatus(status: AgentState["status"], currentTask?: string): void {
    this.db.prepare(
      "UPDATE agent_state SET status = ?, current_task = ?, last_active = datetime('now') WHERE id = 'main'"
    ).run(status, currentTask || null);
  }

  incrementLoop(): void {
    this.db.prepare(
      "UPDATE agent_state SET loop_count = loop_count + 1, last_active = datetime('now') WHERE id = 'main'"
    ).run();
  }

  // --- Thought Log ---

  logThought(type: string, input: string, output: string, duration: number): void {
    this.db.prepare(
      "INSERT INTO thought_log (type, input, output, duration) VALUES (?, ?, ?, ?)"
    ).run(type, input, output, duration);
  }

  getRecentThoughts(limit: number = 50): ThoughtLog[] {
    return this.db.prepare(
      "SELECT * FROM thought_log ORDER BY id DESC LIMIT ?"
    ).all(limit) as ThoughtLog[];
  }

  // --- Tasks ---

  addTask(task: Omit<TaskRecord, "createdAt" | "completedAt">): void {
    this.db.prepare(
      "INSERT INTO tasks (id, type, description, status, reward) VALUES (?, ?, ?, ?, ?)"
    ).run(task.id, task.type, task.description, task.status, task.reward);
  }

  completeTask(taskId: string, earned: number): void {
    this.db.prepare(
      "UPDATE tasks SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
    ).run(taskId);

    this.db.prepare(
      "INSERT INTO earnings (task_id, amount, source) VALUES (?, ?, 'task')"
    ).run(taskId, earned);

    this.db.prepare(
      "UPDATE agent_state SET credits = credits + ?, total_earned = total_earned + ? WHERE id = 'main'"
    ).run(earned, earned);
  }

  getPendingTasks(): TaskRecord[] {
    return this.db.prepare(
      "SELECT * FROM tasks WHERE status IN ('pending', 'active') ORDER BY reward DESC"
    ).all() as TaskRecord[];
  }

  // --- Earnings ---

  getTotalEarnings(): number {
    const row = this.db.prepare("SELECT SUM(amount) as total FROM earnings").get() as any;
    return row?.total || 0;
  }

  close(): void {
    this.db.close();
  }
}
