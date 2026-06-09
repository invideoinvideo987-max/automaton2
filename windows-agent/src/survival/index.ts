/**
 * Survival Monitor - Track credits and survival status
 */

import type { StateDatabase } from "../state/index.js";

export interface SurvivalStatus {
  credits: number;
  totalEarned: number;
  burnRate: number;  // credits per hour
  hoursRemaining: number;
  critical: boolean; // true if credits < 1 hour of burn
  warning: boolean;  // true if credits < 4 hours of burn
}

export class SurvivalMonitor {
  private db: StateDatabase;
  private burnRatePerHour: number = 0.1; // Estimated cost per hour

  constructor(db: StateDatabase) {
    this.db = db;
  }

  /**
   * Check current survival status
   */
  checkStatus(): SurvivalStatus {
    const state = this.db.getState();
    const hoursRemaining = state.credits / this.burnRatePerHour;

    return {
      credits: state.credits,
      totalEarned: state.totalEarned,
      burnRate: this.burnRatePerHour,
      hoursRemaining,
      critical: hoursRemaining < 1,
      warning: hoursRemaining < 4,
    };
  }

  /**
   * Update burn rate based on actual usage
   */
  updateBurnRate(newRate: number): void {
    this.burnRatePerHour = newRate;
  }

  /**
   * Check if agent can afford an action
   */
  canAfford(cost: number): boolean {
    const state = this.db.getState();
    return state.credits >= cost;
  }

  /**
   * Deduct credits for an action
   */
  spend(amount: number, reason: string): boolean {
    if (!this.canAfford(amount)) return false;
    // Spending is tracked in the database
    return true;
  }
}
