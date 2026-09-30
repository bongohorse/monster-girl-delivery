import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

interface LockOwner {
  pid: number;
  host: string;
  token: string;
}

interface AssetLockOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  onWait?: () => void;
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

async function readOwner(path: string): Promise<LockOwner | undefined> {
  try {
    const owner: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (
      typeof owner === 'object' &&
      owner !== null &&
      'pid' in owner &&
      Number.isSafeInteger(owner.pid) &&
      typeof owner.pid === 'number' &&
      owner.pid > 0 &&
      'host' in owner &&
      typeof owner.host === 'string' &&
      'token' in owner &&
      typeof owner.token === 'string' &&
      owner.token.length > 0
    ) {
      return { pid: owner.pid, host: owner.host, token: owner.token };
    }
    return undefined;
  } catch (error) {
    if (hasCode(error, 'ENOENT') || error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function isDeadLocalOwner(owner: LockOwner): boolean {
  if (owner.host !== hostname()) return false;
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    // Permission errors and PID reuse are treated as live/unknown. Age is not proof.
    return hasCode(error, 'ESRCH');
  }
}

async function recoverDeadOwner(lock: string, ownerPath: string): Promise<void> {
  const owner = await readOwner(ownerPath);
  if (!owner || !isDeadLocalOwner(owner)) return;
  const guard = `${lock}.recovery`;
  try {
    await mkdir(guard);
  } catch (error) {
    if (hasCode(error, 'EEXIST')) return;
    throw error;
  }
  try {
    // Another recovery may already have admitted a new writer. Never remove it.
    const current = await readOwner(ownerPath);
    if (current?.token === owner.token && isDeadLocalOwner(current)) {
      await unlink(ownerPath);
      await rmdir(lock);
    }
  } finally {
    await rmdir(guard);
  }
}

async function releaseOwnedLock(lock: string, ownerPath: string, token: string): Promise<void> {
  const current = await readOwner(ownerPath);
  if (current?.token !== token) {
    throw new Error(`Asset lock ownership changed unexpectedly at ${lock}.`);
  }
  await unlink(ownerPath);
  await rmdir(lock);
}

/**
 * Serialize asset mutations within one local checkout. Acquire once around the
 * complete operation, not separately around internal prepare/preview steps.
 * Unknown owners (including interrupted initialization/recovery) are preserved;
 * timeout diagnostics direct the operator to inspect the local lock.
 * Abort never unlocks a still-running action: callers must cancel their own work.
 */
export async function withAssetLock<T>(
  root: string,
  action: () => Promise<T>,
  options: AssetLockOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error('Asset lock timeoutMs must be a finite non-negative number.');
  }
  const reports = join(root, 'reports', 'assets');
  const lock = join(reports, '.write-lock');
  const ownerPath = join(lock, 'owner.json');
  const owner: LockOwner = { pid: process.pid, host: hostname(), token: randomUUID() };
  const started = Date.now();
  await mkdir(reports, { recursive: true });
  let announcedWait = false;
  while (true) {
    options.signal?.throwIfAborted();
    try {
      await mkdir(lock);
      try {
        // Directory acquisition is exclusive. A missing/partial owner remains
        // unknown to contenders, so initialization cannot expose an unlocked gap.
        await writeFile(join(lock, 'owner.tmp'), JSON.stringify(owner), { flag: 'wx' });
        await rename(join(lock, 'owner.tmp'), ownerPath);
      } catch (error) {
        await unlink(join(lock, 'owner.tmp')).catch((cleanupError: unknown) => {
          if (!hasCode(cleanupError, 'ENOENT')) throw cleanupError;
        });
        await unlink(ownerPath).catch((cleanupError: unknown) => {
          if (!hasCode(cleanupError, 'ENOENT')) throw cleanupError;
        });
        await rmdir(lock);
        throw error;
      }
      break;
    } catch (error) {
      if (!hasCode(error, 'EEXIST')) throw error;
    }
    await recoverDeadOwner(lock, ownerPath);
    if (Date.now() - started >= timeoutMs) {
      throw new Error(
        `Timed out waiting for asset writer at ${lock}. Inspect owner.json and any recovery guard; only remove them manually after verifying that no writer is active.`,
      );
    }
    if (!announcedWait) {
      announcedWait = true;
      options.onWait?.();
    }
    await delay(Math.min(50, Math.max(1, timeoutMs - (Date.now() - started))), undefined, {
      signal: options.signal,
    });
  }
  try {
    options.signal?.throwIfAborted();
    const result = await action();
    options.signal?.throwIfAborted();
    return result;
  } finally {
    await releaseOwnedLock(lock, ownerPath, owner.token);
  }
}
