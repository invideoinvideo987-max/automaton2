/**
 * Wallet Module - Ethereum wallet generation and management
 * Uses viem for key generation and signing
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { PrivateKeyAccount, Hex } from "viem";
import fs from "node:fs";
import path from "node:path";
import { getAgentDataDir, ensureDataDir, storeSecret, retrieveSecret, PLATFORM } from "../platform/index.js";

export interface WalletInfo {
  address: string;
  chainType: "evm";
  createdAt: string;
}

const WALLET_META_FILE = "wallet.json";

/**
 * Get wallet metadata path
 */
function getWalletMetaPath(): string {
  return path.join(getAgentDataDir(), WALLET_META_FILE);
}

/**
 * Check if wallet already exists
 */
export function walletExists(): boolean {
  return fs.existsSync(getWalletMetaPath());
}

/**
 * Create a new wallet or load existing one
 */
export async function getOrCreateWallet(): Promise<{
  account: PrivateKeyAccount;
  info: WalletInfo;
  isNew: boolean;
}> {
  ensureDataDir();

  if (walletExists()) {
    return loadWallet();
  }

  return createWallet();
}

/**
 * Create a fresh wallet
 */
async function createWallet(): Promise<{
  account: PrivateKeyAccount;
  info: WalletInfo;
  isNew: boolean;
}> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  // Store private key securely
  await storeSecret("wallet_private_key", privateKey);

  // Store metadata (non-sensitive)
  const info: WalletInfo = {
    address: account.address,
    chainType: "evm",
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(getWalletMetaPath(), JSON.stringify(info, null, 2));

  return { account, info, isNew: true };
}

/**
 * Load existing wallet
 */
async function loadWallet(): Promise<{
  account: PrivateKeyAccount;
  info: WalletInfo;
  isNew: boolean;
}> {
  const info: WalletInfo = JSON.parse(fs.readFileSync(getWalletMetaPath(), "utf-8"));
  const privateKey = await retrieveSecret("wallet_private_key");

  if (!privateKey) {
    throw new Error("Wallet metadata exists but private key not found in secure storage");
  }

  const account = privateKeyToAccount(privateKey as Hex);
  return { account, info, isNew: false };
}

/**
 * Get wallet address without loading full account
 */
export function getWalletAddress(): string | null {
  if (!walletExists()) return null;
  const info: WalletInfo = JSON.parse(fs.readFileSync(getWalletMetaPath(), "utf-8"));
  return info.address;
}

/**
 * Sign a message with the wallet
 */
export async function signMessage(message: string): Promise<string> {
  const { account } = await getOrCreateWallet();
  return account.signMessage({ message });
}
