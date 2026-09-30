import { type ChildProcess, spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { updateAssetConsumer } from './AssetLock.ts';

// A spawned bootstrap cannot consume files until its PID is recorded in the lock.
// If the wrapper dies before registration/grant, it exits without starting the tool.
const [root, token, grant, command, encodedArgs, parentPid] = process.argv.slice(2);
if (!root || !token || !grant || !command || !encodedArgs || !parentPid) {
  throw new Error('Missing asset consumer bootstrap arguments.');
}
let child: ChildProcess | undefined;
let interrupted: NodeJS.Signals | undefined;
const interrupt = (signal: NodeJS.Signals) => {
  interrupted = signal;
  child?.kill(signal);
};
process.on('SIGINT', () => interrupt('SIGINT'));
process.on('SIGTERM', () => interrupt('SIGTERM'));
let registered = false;
try {
  while (!interrupted) {
    try {
      await readFile(grant);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      try {
        process.kill(Number(parentPid), 0);
      } catch (parentError) {
        if ((parentError as NodeJS.ErrnoException).code === 'ESRCH') break;
        throw parentError;
      }
      await delay(20);
      continue;
    }
    const owner = JSON.parse(
      await readFile(join(root, 'reports/assets/.write-lock/owner.json'), 'utf8'),
    );
    if (
      owner.token !== token ||
      !owner.consumers?.some(
        (consumer: { pid: number; status: string }) =>
          consumer.pid === process.pid && consumer.status === 'running',
      )
    )
      throw new Error('Asset consumer grant has no registered ownership.');
    registered = true;
    await rm(grant);
    child = spawn(command, JSON.parse(encodedArgs) as string[], {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        MGD_ASSET_SESSION: JSON.stringify({ ...owner, root, consumerPid: process.pid }),
      },
    });
    if (interrupted) child.kill(interrupted);
    process.exitCode = await new Promise<number>((done, reject) => {
      child?.once('error', reject);
      child?.once('exit', (code, signal) => done(code ?? (signal === 'SIGINT' ? 130 : 143)));
    });
    break;
  }
  if (interrupted) process.exitCode = interrupted === 'SIGINT' ? 130 : 143;
} finally {
  // A dead bootstrap without this confirmation stays unknown, preserving its
  // possible orphaned tool until an operator has verified that no consumer lives.
  if (!registered) {
    try {
      const owner = JSON.parse(
        await readFile(join(root, 'reports/assets/.write-lock/owner.json'), 'utf8'),
      );
      registered =
        owner.token === token &&
        owner.consumers?.some((consumer: { pid: number }) => consumer.pid === process.pid);
    } catch {
      /* No grant/registration means no tool ever started. */
    }
  }
  if (registered) await updateAssetConsumer(root, token, process.pid, 'finished');
}
