import { invoke } from "@tauri-apps/api/core";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShellOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ShellRunOptions {
  cwd?: string;
  env?: Record<string, string>;
}

// ── Prefs ────────────────────────────────────────────────────────────────────

export function prefsGet(key: string): Promise<unknown | null> {
  return invoke<unknown | null>("prefs_get", { key });
}

export function prefsSet(key: string, value: unknown): Promise<void> {
  return invoke<void>("prefs_set", { key, value });
}

export function prefsDelete(key: string): Promise<void> {
  return invoke<void>("prefs_delete", { key });
}

export function prefsGetAll(): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("prefs_get_all");
}

// ── Keychain ─────────────────────────────────────────────────────────────────

export function keychainGet(key: string): Promise<string | null> {
  return invoke<string | null>("keychain_get", { key });
}

export function keychainSet(key: string, value: string): Promise<void> {
  return invoke<void>("keychain_set", { key, value });
}

export function keychainDelete(key: string): Promise<void> {
  return invoke<void>("keychain_delete", { key });
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function shellWhich(program: string): Promise<string | null> {
  return invoke<string | null>("shell_which", { program });
}

export function shellRun(
  program: string,
  args: string[],
  options?: ShellRunOptions,
): Promise<ShellOutput> {
  return invoke<ShellOutput>("shell_run", {
    program,
    args,
    cwd: options?.cwd,
    env: options?.env,
  });
}

export function shellRunStream(
  program: string,
  args: string[],
  options?: ShellRunOptions,
): Promise<void> {
  return invoke<void>("shell_run_stream", {
    program,
    args,
    cwd: options?.cwd,
    env: options?.env,
  });
}
