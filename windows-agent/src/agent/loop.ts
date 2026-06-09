/**
 * Agent Loop - The Core Brain
 * 
 * Think → Act → Observe → Repeat
 * Uses Copilot CLI as the reasoning engine
 */

import { EventEmitter } from "node:events";
import { CopilotTerminal, type CopilotThought } from "../terminal/index.js";
import { StateDatabase } from "../state/index.js";
import { getOrCreateWallet } from "../wallet/index.js";
import { SurvivalMonitor } from "../survival/index.js";
import { TaskManager } from "../tasks/index.js";
import { ulid } from "ulid";

export interface LoopEvent {
  type: "start" | "think" | "act" | "observe" | "idle" | "error" | "stop";
  timestamp: Date;
  data: any;
}

export interface AgentConfig {
  loopIntervalMs: number;      // Time between loops (default: 30s)
  maxConsecutiveErrors: number; // Max errors before sleeping (default: 5)
  idleThresholdMs: number;     // Go idle after this much inactivity (default: 5min)
  survivalMode: boolean;       // If true, prioritize earning over exploration
}

const DEFAULT_CONFIG: AgentConfig = {
  loopIntervalMs: 30000,
  maxConsecutiveErrors: 5,
  idleThresholdMs: 300000,
  survivalMode: false,
};

export class AgentLoop extends EventEmitter {
  private copilot: CopilotTerminal;
  private db: StateDatabase;
  private survival: SurvivalMonitor;
  private tasks: TaskManager;
  private config: AgentConfig;
  private running: boolean = false;
  private loopTimer: NodeJS.Timeout | null = null;
  private consecutiveErrors: number = 0;
  private currentGoal: string = "Initialize and find work";

  constructor(config: Partial<AgentConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.copilot = new CopilotTerminal();
    this.db = new StateDatabase();
    this.survival = new SurvivalMonitor(this.db);
    this.tasks = new TaskManager(this.db);

    // Forward copilot events to UI
    this.copilot.on("thought", (thought: CopilotThought) => {
      this.emit("thought", thought);
      this.db.logThought(thought.type, thought.input, thought.output, thought.duration);
    });

    this.copilot.on("thinking", (data: any) => this.emit("thinking", data));
    this.copilot.on("executing", (data: any) => this.emit("executing", data));
  }

  /**
   * Start the agent loop
   */
  async start(): Promise<void> {
    this.emit("event", { type: "start", timestamp: new Date(), data: {} } as LoopEvent);

    // Initialize wallet
    const { account, info, isNew } = await getOrCreateWallet();
    this.emit("wallet", { address: info.address, isNew });

    // Initialize Copilot CLI
    const copilotReady = await this.copilot.initialize();
    if (!copilotReady) {
      this.emit("event", {
        type: "error",
        timestamp: new Date(),
        data: { message: "Copilot CLI not available - running in limited mode" },
      });
    }

    this.running = true;
    this.db.updateStatus("running");

    // Start the loop
    this.runLoop();
  }

  /**
   * Stop the agent loop
   */
  stop(): void {
    this.running = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.db.updateStatus("idle");
    this.emit("event", { type: "stop", timestamp: new Date(), data: {} } as LoopEvent);
  }

  /**
   * The main loop: Think → Act → Observe
   */
  private async runLoop(): Promise<void> {
    if (!this.running) return;

    try {
      this.db.incrementLoop();
      const state = this.db.getState();

      // === THINK ===
      this.db.updateStatus("thinking");
      this.emit("event", { type: "think", timestamp: new Date(), data: { goal: this.currentGoal } });

      const thought = await this.think(state);

      // === ACT ===
      this.db.updateStatus("acting");
      this.emit("event", { type: "act", timestamp: new Date(), data: { action: thought } });

      const result = await this.act(thought);

      // === OBSERVE ===
      this.emit("event", { type: "observe", timestamp: new Date(), data: { result } });

      await this.observe(result);

      // Reset error counter on success
      this.consecutiveErrors = 0;
      this.db.updateStatus("idle");

    } catch (error: any) {
      this.consecutiveErrors++;
      this.emit("event", {
        type: "error",
        timestamp: new Date(),
        data: { message: error.message, errorCount: this.consecutiveErrors },
      });

      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.emit("event", {
          type: "idle",
          timestamp: new Date(),
          data: { reason: "Too many consecutive errors, sleeping..." },
        });
        this.db.updateStatus("sleeping");
        // Sleep longer after errors
        await this.sleep(this.config.loopIntervalMs * 5);
        this.consecutiveErrors = 0;
      }
    }

    // Schedule next loop
    if (this.running) {
      this.loopTimer = setTimeout(() => this.runLoop(), this.config.loopIntervalMs);
    }
  }

  /**
   * THINK - Determine what to do next
   */
  private async think(state: any): Promise<CopilotThought> {
    const context = this.buildContext(state);
    
    if (this.copilot.available) {
      return this.copilot.think(context);
    }

    // Fallback: basic logic without Copilot
    return {
      id: `thought_fallback_${ulid()}`,
      timestamp: new Date(),
      type: "think",
      input: context,
      output: JSON.stringify({ suggestion: "Check for available tasks", command: null }),
      duration: 0,
    };
  }

  /**
   * ACT - Execute the decided action
   */
  private async act(thought: CopilotThought): Promise<any> {
    try {
      const parsed = JSON.parse(thought.output);
      
      if (parsed.command) {
        // Execute the suggested command
        const result = await this.copilot.execute(parsed.command);
        return result;
      }

      // If no command, check tasks
      const pendingTasks = this.tasks.getPendingTasks();
      if (pendingTasks.length > 0) {
        return { action: "working_on_task", task: pendingTasks[0] };
      }

      return { action: "idle", message: "No actions to take" };
    } catch {
      return { action: "parse_error", raw: thought.output };
    }
  }

  /**
   * OBSERVE - Process the results and update state
   */
  private async observe(result: any): Promise<void> {
    // Update goals based on observation
    if (result.action === "idle") {
      this.currentGoal = "Find new work opportunities";
    }

    // Check survival status
    const survivalStatus = this.survival.checkStatus();
    if (survivalStatus.critical) {
      this.currentGoal = "URGENT: Find income to survive";
      this.config.survivalMode = true;
    }
  }

  /**
   * Build context string for Copilot
   */
  private buildContext(state: any): string {
    const parts = [
      `I am an autonomous agent running on Windows.`,
      `Current goal: ${this.currentGoal}`,
      `Loop count: ${state.loopCount}`,
      `Credits: ${state.credits}`,
      `Status: ${state.status}`,
    ];

    const pendingTasks = this.tasks.getPendingTasks();
    if (pendingTasks.length > 0) {
      parts.push(`Pending tasks: ${pendingTasks.length}`);
    }

    parts.push(`What command should I execute to make progress on my goal?`);

    return parts.join(" | ");
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current agent state
   */
  getState() {
    return this.db.getState();
  }

  /**
   * Get recent thoughts for UI
   */
  getRecentThoughts(count: number = 20) {
    return this.db.getRecentThoughts(count);
  }
}
