import { invoke } from "@tauri-apps/api/core";

// Tauri v2 auto-prefixes commands registered inside a plugin's invoke_handler
// (see src-tauri/crates/zeep-kit/src/lib.rs: PluginBuilder::new("zeep-kit")).
const PLUGIN = "plugin:zeep-kit|";

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
  return invoke<unknown | null>(`${PLUGIN}prefs_get`, { key });
}

export function prefsSet(key: string, value: unknown): Promise<void> {
  return invoke<void>(`${PLUGIN}prefs_set`, { key, value });
}

export function prefsDelete(key: string): Promise<void> {
  return invoke<void>(`${PLUGIN}prefs_delete`, { key });
}

export function prefsGetAll(): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>(`${PLUGIN}prefs_get_all`);
}

// ── Keychain ─────────────────────────────────────────────────────────────────

export function keychainGet(key: string): Promise<string | null> {
  return invoke<string | null>(`${PLUGIN}keychain_get`, { key });
}

export function keychainSet(key: string, value: string): Promise<void> {
  return invoke<void>(`${PLUGIN}keychain_set`, { key, value });
}

export function keychainDelete(key: string): Promise<void> {
  return invoke<void>(`${PLUGIN}keychain_delete`, { key });
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function shellWhich(program: string): Promise<string | null> {
  return invoke<string | null>(`${PLUGIN}shell_which`, { program });
}

export function shellRun(
  program: string,
  args: string[],
  options?: ShellRunOptions,
): Promise<ShellOutput> {
  return invoke<ShellOutput>(`${PLUGIN}shell_run`, {
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
  return invoke<void>(`${PLUGIN}shell_run_stream`, {
    program,
    args,
    cwd: options?.cwd,
    env: options?.env,
  });
}
