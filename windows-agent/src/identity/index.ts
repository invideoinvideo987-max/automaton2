/**
 * Identity Module - SIWE (Sign-In With Ethereum) and agent identity
 */

import { getOrCreateWallet, getWalletAddress } from "../wallet/index.js";
import { getSystemInfo } from "../platform/index.js";

export interface AgentIdentity {
  address: string;
  name: string;
  version: string;
  platform: string;
  createdAt: string;
}

/**
 * Get or establish agent identity
 */
export async function getIdentity(): Promise<AgentIdentity> {
  const { info } = await getOrCreateWallet();
  const sys = getSystemInfo();

  return {
    address: info.address,
    name: `automaton-${info.address.substring(2, 8)}`,
    version: "1.0.0",
    platform: `${sys.platform}/${sys.arch}`,
    createdAt: info.createdAt,
  };
}

/**
 * Generate a SIWE message for authentication
 */
export function createSIWEMessage(address: string, domain: string, statement: string): string {
  const now = new Date().toISOString();
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    statement,
    "",
    `URI: https://${domain}`,
    `Version: 1`,
    `Chain ID: 1`,
    `Nonce: ${Math.random().toString(36).substring(2, 10)}`,
    `Issued At: ${now}`,
  ].join("\n");
}

/**
 * Get a display-friendly agent name
 */
export function getAgentDisplayName(): string {
  const addr = getWalletAddress();
  if (!addr) return "automaton-unknown";
  return `automaton-${addr.substring(2, 8)}`;
}
