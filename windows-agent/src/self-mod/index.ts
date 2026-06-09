/**
 * Self-Modification Module
 * Allows the agent to modify its own code under strict audit constraints
 */

import fs from "node:fs";
import path from "node:path";
import { getAgentDataDir } from "../platform/index.js";

export interface ModificationRecord {
  id: string;
  timestamp: string;
  file: string;
  description: string;
  diff: string;
  approved: boolean;
  appliedAt: string | null;
}

export class SelfModification {
  private auditLog: ModificationRecord[] = [];
  private auditPath: string;

  constructor() {
    this.auditPath = path.join(getAgentDataDir(), "audit-log.json");
    this.loadAuditLog();
  }

  private loadAuditLog(): void {
    if (fs.existsSync(this.auditPath)) {
      this.auditLog = JSON.parse(fs.readFileSync(this.auditPath, "utf-8"));
    }
  }

  private saveAuditLog(): void {
    fs.writeFileSync(this.auditPath, JSON.stringify(this.auditLog, null, 2));
  }

  /**
   * Propose a self-modification (does NOT apply it automatically)
   */
  propose(file: string, description: string, diff: string): ModificationRecord {
    const record: ModificationRecord = {
      id: `mod_${Date.now()}`,
      timestamp: new Date().toISOString(),
      file,
      description,
      diff,
      approved: false,
      appliedAt: null,
    };

    this.auditLog.push(record);
    this.saveAuditLog();
    return record;
  }

  /**
   * Get all proposed modifications
   */
  getProposals(): ModificationRecord[] {
    return this.auditLog.filter(m => !m.approved);
  }

  /**
   * Get audit log
   */
  getAuditLog(): ModificationRecord[] {
    return [...this.auditLog];
  }

  /**
   * Check if a file modification is safe (basic checks)
   */
  isSafe(file: string, content: string): { safe: boolean; reason?: string } {
    // Never modify constitution
    if (file.includes("constitution")) {
      return { safe: false, reason: "Cannot modify constitution" };
    }

    // Check for obviously dangerous patterns
    const dangerous = [
      /rm\s+-rf\s+\//,
      /format\s+c:/i,
      /del\s+\/s\s+\/q/i,
      /crypto.*mine/i,
      /keylog/i,
    ];

    for (const pattern of dangerous) {
      if (pattern.test(content)) {
        return { safe: false, reason: `Dangerous pattern detected: ${pattern}` };
      }
    }

    return { safe: true };
  }
}
