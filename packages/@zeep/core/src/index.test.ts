import { describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  prefsGet,
  prefsSet,
  prefsDelete,
  prefsGetAll,
  keychainGet,
  keychainSet,
  keychainDelete,
  shellWhich,
  shellRun,
  shellRunStream,
} from './index.ts';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = invoke as unknown as ReturnType<typeof vi.fn>;

describe('prefs', () => {
  it('prefsGet invokes prefs_get with the key and returns the result', async () => {
    mockInvoke.mockResolvedValueOnce('stored-value');
    const result = await prefsGet('theme');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|prefs_get', { key: 'theme' });
    expect(result).toBe('stored-value');
  });

  it('prefsSet invokes prefs_set with key and value', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await prefsSet('theme', 'dark');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|prefs_set', { key: 'theme', value: 'dark' });
  });

  it('prefsDelete invokes prefs_delete with the key', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await prefsDelete('theme');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|prefs_delete', { key: 'theme' });
  });

  it('prefsGetAll invokes prefs_get_all with no args', async () => {
    mockInvoke.mockResolvedValueOnce({ theme: 'dark' });
    const result = await prefsGetAll();
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|prefs_get_all');
    expect(result).toEqual({ theme: 'dark' });
  });
});

describe('keychain', () => {
  it('keychainGet invokes keychain_get with the key', async () => {
    mockInvoke.mockResolvedValueOnce('secret');
    const result = await keychainGet('api-token');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|keychain_get', { key: 'api-token' });
    expect(result).toBe('secret');
  });

  it('keychainSet invokes keychain_set with key and value', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await keychainSet('api-token', 'secret');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|keychain_set', { key: 'api-token', value: 'secret' });
  });

  it('keychainDelete invokes keychain_delete with the key', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await keychainDelete('api-token');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|keychain_delete', { key: 'api-token' });
  });
});

describe('shell', () => {
  it('shellWhich invokes shell_which with the program', async () => {
    mockInvoke.mockResolvedValueOnce('/usr/bin/node');
    const result = await shellWhich('node');
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|shell_which', { program: 'node' });
    expect(result).toBe('/usr/bin/node');
  });

  it('shellRun invokes shell_run with program, args, cwd, env', async () => {
    const output = { stdout: 'v20.20.2', stderr: '', exitCode: 0 };
    mockInvoke.mockResolvedValueOnce(output);
    const result = await shellRun('node', ['--version'], { cwd: '/tmp', env: { FOO: 'bar' } });
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|shell_run', {
      program: 'node',
      args: ['--version'],
      cwd: '/tmp',
      env: { FOO: 'bar' },
    });
    expect(result).toEqual(output);
  });

  it('shellRun omits cwd/env when options are not passed', async () => {
    mockInvoke.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 });
    await shellRun('node', ['--version']);
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|shell_run', {
      program: 'node',
      args: ['--version'],
      cwd: undefined,
      env: undefined,
    });
  });

  it('shellRunStream invokes shell_run_stream with program, args, cwd, env', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await shellRunStream('node', ['--version'], { cwd: '/tmp' });
    expect(mockInvoke).toHaveBeenCalledWith('plugin:zeep-kit|shell_run_stream', {
      program: 'node',
      args: ['--version'],
      cwd: '/tmp',
      env: undefined,
    });
  });
});
