import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { withAssetLock } from '../../scripts/assets/AssetLock';

const roots: string[] = [];
const children: ReturnType<typeof spawn>[] = [];
async function checkout() {
  const root = await mkdtemp(join(tmpdir(), 'mgd-asset-lock-'));
  roots.push(root);
  return root;
}
function writer(root: string, body: string, setup = '', options = '') {
  const module = resolve('scripts/assets/AssetLock.ts');
  const child = spawn(
    'bun',
    [
      '-e',
      `import { withAssetLock } from ${JSON.stringify(module)}; import { appendFile } from 'node:fs/promises'; ${setup} await withAssetLock(${JSON.stringify(root)}, async () => { ${body} }${options});`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  children.push(child);
  return child;
}
async function ready(child: ReturnType<typeof spawn>) {
  let output = '';
  for await (const data of child.stdout ?? []) {
    output += String(data);
    if (output.includes('ready')) return;
  }
  throw new Error(`Writer exited before readiness: ${output}`);
}
afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      child.kill('SIGKILL');
      await closed;
    }
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('asset checkout write lock', () => {
  it('serializes independent writers for the same checkout', async () => {
    const root = await checkout();
    const ledger = join(root, 'ledger');
    const first = writer(
      root,
      `await appendFile(${JSON.stringify(ledger)}, 'A start\\n'); console.log('ready'); await new Promise(r => setTimeout(r, 150)); await appendFile(${JSON.stringify(ledger)}, 'A end\\n');`,
    );
    await ready(first);
    const firstDone = once(first, 'close');
    const second = writer(
      root,
      `await appendFile(${JSON.stringify(ledger)}, 'B start\\nB end\\n');`,
    );
    await Promise.all([firstDone, once(second, 'close')]);
    expect(await readFile(ledger, 'utf8')).toBe('A start\nA end\nB start\nB end\n');
    expect(second.exitCode).toBe(0);
  });
  it('recovers a SIGKILL owner and serializes competing recovery processes', async () => {
    const root = await checkout();
    const owner = writer(root, "console.log('ready'); await new Promise(() => {});");
    await ready(owner);
    const killed = once(owner, 'close');
    owner.kill('SIGKILL');
    await killed;
    const ledger = join(root, 'recovery');
    const body = `await appendFile(${JSON.stringify(ledger)}, 'start\\n'); await new Promise(r => setTimeout(r, 80)); await appendFile(${JSON.stringify(ledger)}, 'end\\n');`;
    const writers = Array.from({ length: 4 }, () => writer(root, body));
    await Promise.all(writers.map((child) => once(child, 'close')));
    expect(writers.map((child) => child.exitCode)).toEqual([0, 0, 0, 0]);
    expect(await readFile(ledger, 'utf8')).toBe('start\nend\n'.repeat(4));
  });

  it('times out without taking an active owner and announces the wait once', async () => {
    const root = await checkout();
    const owner = writer(root, "console.log('ready'); await new Promise(() => {});");
    await ready(owner);
    let waitCount = 0;
    let ran = false;
    await expect(
      withAssetLock(
        root,
        async () => {
          ran = true;
        },
        {
          timeoutMs: 80,
          onWait: () => {
            waitCount++;
          },
        },
      ),
    ).rejects.toThrow('Timed out waiting');
    expect(ran).toBe(false);
    expect(waitCount).toBe(1);
    expect(
      JSON.parse(await readFile(join(root, 'reports/assets/.write-lock/owner.json'), 'utf8')).pid,
    ).toBe(owner.pid);
  });

  it('preserves malformed or foreign owners instead of using lock age as proof', async () => {
    const root = await checkout();
    const lock = join(root, 'reports/assets/.write-lock');
    await mkdir(lock, { recursive: true });
    for (const content of [
      '{',
      JSON.stringify({ pid: process.pid, host: `${hostname()}-other`, token: 'external' }),
    ]) {
      await writeFile(join(lock, 'owner.json'), content);
      await expect(withAssetLock(root, async () => 'unexpected', { timeoutMs: 0 })).rejects.toThrow(
        'Timed out waiting',
      );
      expect(await readFile(join(lock, 'owner.json'), 'utf8')).toBe(content);
    }
  });

  it('abort stops waiting without disturbing the active writer', async () => {
    const root = await checkout();
    const controller = new AbortController();
    await withAssetLock(root, async () => {
      const waiting = withAssetLock(root, async () => 'unexpected', {
        signal: controller.signal,
        onWait: () => controller.abort(new Error('cancelled')),
      });
      await expect(waiting).rejects.toThrow();
      expect(await readFile(join(root, 'reports/assets/.write-lock/owner.json'), 'utf8')).toContain(
        String(process.pid),
      );
    });
    await expect(withAssetLock(root, async () => 'available')).resolves.toBe('available');
  });

  it('releases after errors and holds an aborted action until cleanup settles', async () => {
    const root = await checkout();
    await expect(
      withAssetLock(root, async () => {
        throw new Error('export failed');
      }),
    ).rejects.toThrow('export failed');
    const controller = new AbortController();
    let finish: (() => void) | undefined;
    const settled = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const active = withAssetLock(
      root,
      async () => {
        controller.abort(new Error('cancelled'));
        await settled;
      },
      { signal: controller.signal },
    );
    // Waiting for the action to enter avoids aborting acquisition instead.
    while (!controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, 1));
    await expect(withAssetLock(root, async () => 'unexpected', { timeoutMs: 0 })).rejects.toThrow(
      'Timed out waiting',
    );
    finish?.();
    await expect(active).rejects.toThrow('cancelled');
    await expect(withAssetLock(root, async () => 'available')).resolves.toBe('available');
  });

  it('releases after SIGTERM when the CLI cancels and settles its action', async () => {
    const root = await checkout();
    const child = writer(
      root,
      "console.log('ready'); await new Promise(resolve => controller.signal.addEventListener('abort', resolve, { once: true }));",
      "const controller = new AbortController(); process.once('SIGTERM', () => controller.abort(new Error('terminated')));",
      ', { signal: controller.signal }',
    );
    await ready(child);
    const stopped = once(child, 'close');
    child.kill('SIGTERM');
    await stopped;
    expect(child.exitCode).not.toBe(0);
    await expect(
      readFile(join(root, 'reports/assets/.write-lock/owner.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(withAssetLock(root, async () => 'available')).resolves.toBe('available');
  });
});
