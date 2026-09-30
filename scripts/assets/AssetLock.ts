import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

interface ConsumerOwner {
  pid: number;
  status: 'running' | 'finished';
}

interface LockOwner {
  pid: number;
  host: string;
  token: string;
  consumers?: ConsumerOwner[];
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
      const consumers = 'consumers' in owner ? owner.consumers : undefined;
      if (
        consumers !== undefined &&
        (!Array.isArray(consumers) ||
          consumers.some(
            (consumer: unknown) =>
              typeof consumer !== 'object' ||
              consumer === null ||
              !('pid' in consumer) ||
              !Number.isSafeInteger(consumer.pid) ||
              Number(consumer.pid) <= 0 ||
              !('status' in consumer) ||
              !['running', 'finished'].includes(String(consumer.status)),
          ))
      )
        return undefined;
      return {
        pid: owner.pid,
        host: owner.host,
        token: owner.token,
        ...(consumers ? { consumers: consumers as ConsumerOwner[] } : {}),
      };
    }
    return undefined;
  } catch (error) {
    if (hasCode(error, 'ENOENT') || error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function isDeadLocalOwner(owner: LockOwner): boolean {
  if (
    owner.host !== hostname() ||
    owner.consumers?.some((consumer) => consumer.status !== 'finished')
  )
    return false;
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
  if (current.consumers?.some((consumer) => consumer.status !== 'finished')) {
    throw new Error(
      `Asset consumer did not confirm completion at ${lock}; inspect owner.json before recovering this lock.`,
    );
  }
  await unlink(ownerPath);
  await rmdir(lock);
}

/** Register before granting execution; an unfinished consumer is never inferred safe from PID death. */
export async function updateAssetConsumer(
  root: string,
  token: string,
  pid: number,
  status: 'running' | 'finished',
): Promise<void> {
  const path = join(root, 'reports/assets/.write-lock/owner.json');
  const owner = await readOwner(path);
  if (!owner || owner.token !== token) throw new Error('Asset consumer lock ownership changed.');
  const consumers = owner.consumers ?? [];
  const index = consumers.findIndex((consumer) => consumer.pid === pid);
  if (index < 0) consumers.push({ pid, status });
  else consumers[index] = { pid, status };
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify({ ...owner, consumers }));
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!hasCode(error, 'ENOENT')) throw error;
    });
  }
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
