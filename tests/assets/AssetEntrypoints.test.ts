import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { createServer } from 'vite';
import { afterEach, expect, test } from 'vitest';
import { prepareAsset } from '../../scripts/assets/AssetCandidate';
import {
  assetPipelinePlugin,
  openAssetSession,
  runAssetConsumer,
} from '../../scripts/assets/AssetEntrypoints';
import { withAssetLock } from '../../scripts/assets/AssetLock';
import { buildRuntime } from '../../scripts/assets/AssetRuntime';

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mgd-consumer-'));
  roots.push(root);
  const file = join(root, 'source.png');
  await sharp({ create: { width: 32, height: 32, channels: 4, background: '#ff0000' } })
    .png()
    .toFile(file);
  const candidate = await prepareAsset(root, {
    id: 'trial',
    file,
    profile: 'static-png',
    width: 32,
    height: 32,
    displayWidth: 32,
    displayHeight: 32,
    provenance: 'entrypoint fixture',
  });
  await writeFile(
    join(root, 'assets/metadata/trial.json'),
    JSON.stringify({ ...candidate.recipe, state: 'active' }),
  );
  return root;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function waitForFile(file: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      await readFile(file);
      return;
    } catch {
      await delay(25);
    }
  }
  throw new Error(`Consumer did not create ${file}`);
}

test('a real inherited consumer retains one guard until its process finishes', async () => {
  const root = await fixture();
  const code = `
    import { openAssetSession } from ${JSON.stringify(resolve('scripts/assets/AssetEntrypoints.ts'))};
    import { readFile, writeFile } from 'node:fs/promises';
    import { setTimeout as delay } from 'node:timers/promises';
    const session = await openAssetSession(process.cwd());
    await writeFile('consumer-ready', 'ready');
    while (true) { try { await readFile('consumer-finish'); break; } catch { await delay(20); } }
    await session.close();
  `;
  const consumer = runAssetConsumer(root, 'bun', ['--eval', code]);
  let writer: Promise<void> | undefined;
  let entered = false;
  try {
    await waitForFile(join(root, 'consumer-ready'));
    let waiting = () => {};
    const observedWait = new Promise<void>((done) => {
      waiting = done;
    });
    writer = withAssetLock(
      root,
      async () => {
        entered = true;
      },
      { onWait: waiting },
    );
    await observedWait;
    expect(entered).toBe(false);
  } finally {
    await writeFile(join(root, 'consumer-finish'), 'finish');
  }
  expect(await consumer).toBe(0);
  await writer;
  expect(entered).toBe(true);
  await expect(readFile(join(root, 'reports/assets/.write-lock/owner.json'))).rejects.toThrow();
});

test('consumer exit failure preserves its status and releases ownership', async () => {
  const root = await fixture();
  expect(await runAssetConsumer(root, process.execPath, ['-e', 'process.exit(7)'])).toBe(7);
  await withAssetLock(root, async () => {});
});

test('source edits during a finite consumer fail final verification and release the guard', async () => {
  const root = await fixture();
  const code = `const fs = require('node:fs'); const file = 'assets/metadata/trial.json'; const recipe = JSON.parse(fs.readFileSync(file)); recipe.display.width += 1; fs.writeFileSync(file, JSON.stringify(recipe));`;
  await expect(runAssetConsumer(root, process.execPath, ['-e', code])).rejects.toThrow();
  await withAssetLock(root, async () => {});
});

test('a real Vite dev session releases the preparation lock but blocks runtime replacement', async () => {
  const root = await fixture();
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Asset fixture</title>');
  const server = await createServer({
    root,
    configFile: false,
    plugins: [assetPipelinePlugin()],
    server: { port: 0, host: '127.0.0.1' },
  });
  const recipeFile = join(root, 'assets/metadata/trial.json');
  const previous = await readFile(recipeFile, 'utf8');
  try {
    await server.listen();
    const beforeRestart = JSON.parse(
      await readFile(join(root, 'reports/assets/dev-server.json'), 'utf8'),
    );
    await server.restart();
    const afterRestart = JSON.parse(
      await readFile(join(root, 'reports/assets/dev-server.json'), 'utf8'),
    );
    expect(afterRestart.token).not.toBe(beforeRestart.token);
    await withAssetLock(root, async () => {});
    expect(
      JSON.parse(await readFile(join(root, 'reports/assets/dev-server.json'), 'utf8')).pid,
    ).toBe(process.pid);
    await buildRuntime(root); // Verified unchanged reuse remains safe while serving.
    const recipe = JSON.parse(previous);
    recipe.display.width += 1;
    await writeFile(recipeFile, JSON.stringify(recipe));
    await expect(buildRuntime(root)).rejects.toThrow();
  } finally {
    await writeFile(recipeFile, previous);
    await server.close();
  }
  await expect(readFile(join(root, 'reports/assets/dev-server.json'))).rejects.toThrow();
  await buildRuntime(root);
});

test('interrupting a real wrapper forwards the signal and releases its owned guard', async () => {
  const root = await fixture();
  const childCode = `require('node:fs').writeFileSync('consumer-ready', 'ready'); setInterval(() => {}, 1000);`;
  const wrapperCode = `
    import { runAssetConsumer } from ${JSON.stringify(resolve('scripts/assets/AssetEntrypoints.ts'))};
    process.exitCode = await runAssetConsumer(process.cwd(), process.execPath, ['-e', ${JSON.stringify(childCode)}]);
  `;
  const wrapper = spawn('bun', ['--eval', wrapperCode], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, MGD_ASSET_SESSION: undefined },
  });
  const exited = new Promise<number | null>((done, reject) => {
    wrapper.once('error', reject);
    wrapper.once('exit', done);
  });
  try {
    await waitForFile(join(root, 'consumer-ready'));
  } finally {
    wrapper.kill('SIGTERM');
  }
  expect(await exited).toBe(143);
  await expect(readFile(join(root, 'reports/assets/.write-lock/owner.json'))).rejects.toThrow();
  await withAssetLock(root, async () => {});
});

test('entrypoint guards reject symlinked report paths before writing outside the checkout', async () => {
  const root = await fixture();
  const outside = await mkdtemp(join(tmpdir(), 'mgd-consumer-outside-'));
  roots.push(outside);
  await rm(join(root, 'reports/assets'), { recursive: true });
  await symlink(outside, join(root, 'reports/assets'), 'dir');
  await expect(openAssetSession(root)).rejects.toThrow('Symlinks');
  expect(await readdir(outside)).toEqual([]);
});

test('SIGKILL of the wrapper keeps a live orphan consumer guarded until confirmed completion', async () => {
  const root = await fixture();
  const childCode = `
    const fs = require('node:fs');
    fs.writeFileSync('consumer-ready', 'ready');
    const interval = setInterval(() => { if (fs.existsSync('consumer-finish')) { clearInterval(interval); } }, 20);
  `;
  const wrapperCode = `
    import { runAssetConsumer } from ${JSON.stringify(resolve('scripts/assets/AssetEntrypoints.ts'))};
    process.exitCode = await runAssetConsumer(process.cwd(), process.execPath, ['-e', ${JSON.stringify(childCode)}]);
  `;
  const wrapper = spawn('bun', ['--eval', wrapperCode], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, MGD_ASSET_SESSION: undefined },
  });
  const exited = new Promise<void>((done, reject) => {
    wrapper.once('error', reject);
    wrapper.once('exit', () => done());
  });
  const ownerFile = join(root, 'reports/assets/.write-lock/owner.json');
  try {
    await waitForFile(join(root, 'consumer-ready'));
    wrapper.kill('SIGKILL');
    await exited;
    const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
    expect(owner.consumers[0].status).toBe('running');
    process.kill(owner.consumers[0].pid, 0); // The registered bootstrap still protects its actual tool.
    await expect(withAssetLock(root, async () => {}, { timeoutMs: 100 })).rejects.toThrow(
      'Timed out',
    );
    expect(JSON.parse(await readFile(ownerFile, 'utf8')).token).toBe(owner.token);
  } finally {
    wrapper.kill('SIGKILL');
    await writeFile(join(root, 'consumer-finish'), 'finish');
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
    if (owner.consumers.every((consumer: { status: string }) => consumer.status === 'finished'))
      break;
    await delay(25);
  }
  await withAssetLock(root, async () => {}, { timeoutMs: 1000 });
  await expect(readFile(ownerFile)).rejects.toThrow();
});

test('a killed bootstrap keeps its live orphan tool unknown instead of recovering its outputs', async () => {
  const root = await fixture();
  const childCode = `
    const fs = require('node:fs');
    fs.writeFileSync('consumer-ready', String(process.pid));
    const interval = setInterval(() => { if (fs.existsSync('consumer-finish')) { clearInterval(interval); fs.writeFileSync('consumer-done', 'done'); } }, 20);
  `;
  const wrapperCode = `
    import { runAssetConsumer } from ${JSON.stringify(resolve('scripts/assets/AssetEntrypoints.ts'))};
    process.exitCode = await runAssetConsumer(process.cwd(), process.execPath, ['-e', ${JSON.stringify(childCode)}]);
  `;
  const wrapper = spawn('bun', ['--eval', wrapperCode], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MGD_ASSET_SESSION: undefined },
  });
  let diagnostic = '';
  wrapper.stderr.on('data', (chunk: Buffer) => {
    diagnostic += chunk.toString();
  });
  const exited = new Promise<number | null>((done, reject) => {
    wrapper.once('error', reject);
    wrapper.once('exit', done);
  });
  const ownerFile = join(root, 'reports/assets/.write-lock/owner.json');
  try {
    await waitForFile(join(root, 'consumer-ready'));
    const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
    const toolPid = Number(await readFile(join(root, 'consumer-ready'), 'utf8'));
    process.kill(owner.consumers[0].pid, 'SIGKILL');
    expect(await exited).toBe(1);
    process.kill(toolPid, 0);
    expect(diagnostic).toContain('did not confirm completion');
    await expect(withAssetLock(root, async () => {}, { timeoutMs: 100 })).rejects.toThrow(
      'Timed out',
    );
    await writeFile(join(root, 'consumer-finish'), 'finish');
    await waitForFile(join(root, 'consumer-done'));
    // Even after the tool finishes, the killed bootstrap cannot confirm it.
    await expect(withAssetLock(root, async () => {}, { timeoutMs: 100 })).rejects.toThrow(
      'Timed out',
    );
  } finally {
    wrapper.kill('SIGKILL');
    await writeFile(join(root, 'consumer-finish'), 'finish');
    await waitForFile(join(root, 'consumer-done'));
  }
});
