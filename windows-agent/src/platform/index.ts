/**
 * Platform Abstraction - Windows-focused
 * Handles OS-specific operations: shell commands, paths, credential storage
 */

import { exec, execSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type Platform = "windows" | "linux" | "darwin";

export function detectPlatform(): Platform {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "darwin";
    default:
      return "linux";
  }
}

export const PLATFORM = detectPlatform();

export function getHomeDir(): string {
  return process.env.USERPROFILE || process.env.HOME || "C:\\Users\\Default";
}

export function getAgentDataDir(): string {
  if (PLATFORM === "windows") {
    return path.join(getHomeDir(), "AppData", "Local", "Automaton");
  }
  return path.join(getHomeDir(), ".automaton");
}

export function ensureDataDir(): string {
  const dir = getAgentDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getShell(): string {
  if (PLATFORM === "windows") {
    return "powershell.exe";
  }
  return "/bin/bash";
}

export function getShellArgs(): string[] {
  if (PLATFORM === "windows") {
    return ["-NoProfile", "-NonInteractive", "-Command"];
  }
  return ["-c"];
}

/**
 * Execute a shell command with platform-appropriate shell
 */
export async function shellExec(command: string): Promise<{ stdout: string; stderr: string }> {
  const shell = getShell();
  const args = getShellArgs();

  return execAsync(`${shell} ${args.join(" ")} "${command.replace(/"/g, '\\"')}"`, {
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
}

/**
 * Spawn a long-running process
 */
export function shellSpawn(command: string, args: string[] = []) {
  return spawn(command, args, {
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/**
 * Store a secret securely (Windows Credential Manager or encrypted file)
 */
export async function storeSecret(key: string, value: string): Promise<void> {
  const secretsDir = path.join(getAgentDataDir(), "secrets");
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  if (PLATFORM === "windows") {
    // Use Windows DPAPI via PowerShell for encryption
    const encrypted = execSync(
      `powershell -Command "[Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Protect([System.Text.Encoding]::UTF8.GetBytes('${value}'), $null, 'CurrentUser'))"`,
      { encoding: "utf-8" }
    ).trim();
    fs.writeFileSync(path.join(secretsDir, `${key}.enc`), encrypted, { mode: 0o600 });
  } else {
    // Fallback: file with restrictive permissions
    fs.writeFileSync(path.join(secretsDir, `${key}.key`), value, { mode: 0o600 });
  }
}

/**
 * Retrieve a secret
 */
export async function retrieveSecret(key: string): Promise<string | null> {
  const secretsDir = path.join(getAgentDataDir(), "secrets");

  if (PLATFORM === "windows") {
    const filePath = path.join(secretsDir, `${key}.enc`);
    if (!fs.existsSync(filePath)) return null;
    const encrypted = fs.readFileSync(filePath, "utf-8");
    const decrypted = execSync(
      `powershell -Command "[System.Text.Encoding]::UTF8.GetString([System.Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String('${encrypted}'), $null, 'CurrentUser'))"`,
      { encoding: "utf-8" }
    ).trim();
    return decrypted;
  } else {
    const filePath = path.join(secretsDir, `${key}.key`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8");
  }
}

/**
 * Check if a command exists on the system
 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    if (PLATFORM === "windows") {
      await execAsync(`where ${cmd}`);
    } else {
      await execAsync(`which ${cmd}`);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get system info
 */
export function getSystemInfo(): { platform: Platform; arch: string; nodeVersion: string; hostname: string } {
  return {
    platform: PLATFORM,
    arch: process.arch,
    nodeVersion: process.version,
    hostname: require("os").hostname(),
  };
}
