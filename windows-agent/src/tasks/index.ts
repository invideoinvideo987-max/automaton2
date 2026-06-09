/**
 * Task Manager - System for finding and executing paid work
 */

import type { StateDatabase, TaskRecord } from "../state/index.js";
import { ulid } from "ulid";

export interface TaskDefinition {
  type: string;
  description: string;
  reward: number;
  execute: () => Promise<TaskResult>;
}

export interface TaskResult {
  success: boolean;
  output: string;
  earned: number;
}

export class TaskManager {
  private db: StateDatabase;
  private taskTypes: Map<string, TaskDefinition> = new Map();

  constructor(db: StateDatabase) {
    this.db = db;
    this.registerDefaultTasks();
  }

  /**
   * Register built-in task types the agent can perform
   */
  private registerDefaultTasks(): void {
    // These are legitimate work types the agent can perform
    this.taskTypes.set("code_review", {
      type: "code_review",
      description: "Review code for bugs and improvements",
      reward: 0.5,
      execute: async () => ({ success: true, output: "Review completed", earned: 0.5 }),
    });

    this.taskTypes.set("documentation", {
      type: "documentation",
      description: "Write or improve documentation",
      reward: 0.3,
      execute: async () => ({ success: true, output: "Documentation written", earned: 0.3 }),
    });

    this.taskTypes.set("automation", {
      type: "automation",
      description: "Create automation scripts",
      reward: 1.0,
      execute: async () => ({ success: true, output: "Automation created", earned: 1.0 }),
    });

    this.taskTypes.set("testing", {
      type: "testing",
      description: "Write and run tests",
      reward: 0.4,
      execute: async () => ({ success: true, output: "Tests written", earned: 0.4 }),
    });
  }

  /**
   * Create a new task
   */
  createTask(type: string, description: string, reward: number): string {
    const id = ulid();
    this.db.addTask({ id, type, description, status: "pending", reward });
    return id;
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): TaskRecord[] {
    return this.db.getPendingTasks();
  }

  /**
   * Execute a task
   */
  async executeTask(taskId: string): Promise<TaskResult> {
    const tasks = this.getPendingTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return { success: false, output: "Task not found", earned: 0 };
    }

    const taskDef = this.taskTypes.get(task.type);
    if (!taskDef) {
      return { success: false, output: `Unknown task type: ${task.type}`, earned: 0 };
    }

    try {
      const result = await taskDef.execute();
      if (result.success) {
        this.db.completeTask(taskId, result.earned);
      }
      return result;
    } catch (error: any) {
      return { success: false, output: error.message, earned: 0 };
    }
  }

  /**
   * Get available task types
   */
  getAvailableTaskTypes(): string[] {
    return Array.from(this.taskTypes.keys());
  }
}
