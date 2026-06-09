/**
 * Terminal Module - GitHub Copilot CLI Integration
 * 
 * Uses `gh copilot suggest` and `gh copilot explain` as the reasoning brain.
 * Wraps the Copilot CLI to provide Think/Act capabilities.
 */

import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { commandExists, PLATFORM } from "../platform/index.js";
import { EventEmitter } from "node:events";

const execAsync = promisify(exec);

export interface CopilotThought {
  id: string;
  timestamp: Date;
  type: "think" | "suggest" | "explain" | "execute" | "error";
  input: string;
  output: string;
  duration: number;
}

export interface CopilotResponse {
  success: boolean;
  output: string;
  suggestion?: string;
  command?: string;
  explanation?: string;
}

export class CopilotTerminal extends EventEmitter {
  private thoughts: CopilotThought[] = [];
  private isAvailable: boolean = false;
  private thoughtCounter: number = 0;

  async initialize(): Promise<boolean> {
    // Check if gh CLI is installed
    const ghExists = await commandExists("gh");
    if (!ghExists) {
      this.emit("status", { type: "error", message: "GitHub CLI (gh) not found. Install from https://cli.github.com" });
      return false;
    }

    // Check if copilot extension is available
    try {
      await execAsync("gh copilot --version");
      this.isAvailable = true;
      this.emit("status", { type: "ready", message: "Copilot CLI ready" });
      return true;
    } catch {
      this.emit("status", { type: "error", message: "GitHub Copilot CLI extension not found. Run: gh extension install github/gh-copilot" });
      return false;
    }
  }

  /**
   * Ask Copilot to suggest a command for a given task
   */
  async suggest(prompt: string, type: "shell" | "gh" | "git" = "shell"): Promise<CopilotResponse> {
    const start = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(
        `gh copilot suggest -t ${type} "${prompt.replace(/"/g, '\\"')}"`,
        { timeout: 60000 }
      );

      const thought: CopilotThought = {
        id: `thought_${++this.thoughtCounter}`,
        timestamp: new Date(),
        type: "suggest",
        input: prompt,
        output: stdout,
        duration: Date.now() - start,
      };
      this.thoughts.push(thought);
      this.emit("thought", thought);

      return {
        success: true,
        output: stdout,
        suggestion: stdout.trim(),
        command: this.extractCommand(stdout),
      };
    } catch (error: any) {
      const thought: CopilotThought = {
        id: `thought_${++this.thoughtCounter}`,
        timestamp: new Date(),
        type: "error",
        input: prompt,
        output: error.message || "Unknown error",
        duration: Date.now() - start,
      };
      this.thoughts.push(thought);
      this.emit("thought", thought);

      return { success: false, output: error.message };
    }
  }

  /**
   * Ask Copilot to explain something
   */
  async explain(command: string): Promise<CopilotResponse> {
    const start = Date.now();

    try {
      const { stdout } = await execAsync(
        `gh copilot explain "${command.replace(/"/g, '\\"')}"`,
        { timeout: 60000 }
      );

      const thought: CopilotThought = {
        id: `thought_${++this.thoughtCounter}`,
        timestamp: new Date(),
        type: "explain",
        input: command,
        output: stdout,
        duration: Date.now() - start,
      };
      this.thoughts.push(thought);
      this.emit("thought", thought);

      return {
        success: true,
        output: stdout,
        explanation: stdout.trim(),
      };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }

  /**
   * Think about a problem - combines suggest + explain for reasoning
   */
  async think(problem: string): Promise<CopilotThought> {
    const start = Date.now();

    this.emit("thinking", { problem });

    // First get a suggestion
    const suggestion = await this.suggest(problem);
    
    // Then explain the reasoning if we got a command
    let explanation = "";
    if (suggestion.command) {
      const explainResult = await this.explain(suggestion.command);
      explanation = explainResult.explanation || "";
    }

    const thought: CopilotThought = {
      id: `thought_${++this.thoughtCounter}`,
      timestamp: new Date(),
      type: "think",
      input: problem,
      output: JSON.stringify({
        suggestion: suggestion.suggestion,
        command: suggestion.command,
        explanation,
      }),
      duration: Date.now() - start,
    };

    this.thoughts.push(thought);
    this.emit("thought", thought);
    return thought;
  }

  /**
   * Execute a command that was suggested
   */
  async execute(command: string): Promise<CopilotResponse> {
    const start = Date.now();

    this.emit("executing", { command });

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        shell: PLATFORM === "windows" ? "powershell.exe" : "/bin/bash",
      });

      const thought: CopilotThought = {
        id: `thought_${++this.thoughtCounter}`,
        timestamp: new Date(),
        type: "execute",
        input: command,
        output: stdout + (stderr ? `\n[stderr]: ${stderr}` : ""),
        duration: Date.now() - start,
      };
      this.thoughts.push(thought);
      this.emit("thought", thought);

      return { success: true, output: stdout };
    } catch (error: any) {
      const thought: CopilotThought = {
        id: `thought_${++this.thoughtCounter}`,
        timestamp: new Date(),
        type: "error",
        input: command,
        output: error.message,
        duration: Date.now() - start,
      };
      this.thoughts.push(thought);
      this.emit("thought", thought);

      return { success: false, output: error.message };
    }
  }

  /**
   * Get all thoughts (for UI display)
   */
  getThoughts(): CopilotThought[] {
    return [...this.thoughts];
  }

  /**
   * Get recent thoughts
   */
  getRecentThoughts(count: number = 10): CopilotThought[] {
    return this.thoughts.slice(-count);
  }

  /**
   * Check if Copilot CLI is available
   */
  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * Extract a command from Copilot's suggestion output
   */
  private extractCommand(output: string): string | undefined {
    // Copilot CLI typically outputs the command on a line by itself
    const lines = output.split("\n").map(l => l.trim()).filter(Boolean);
    // Usually the actual command is the last non-empty line or after a separator
    for (const line of lines) {
      if (line.startsWith("$") || line.startsWith(">")) {
        return line.slice(1).trim();
      }
    }
    // Return the last line as fallback
    return lines[lines.length - 1];
  }
}
