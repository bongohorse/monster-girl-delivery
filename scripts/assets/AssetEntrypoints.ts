import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateAssetConsumer, withAssetLock } from './AssetLock.ts';
import { assetPath } from './AssetRecipe.ts';
import { buildRuntimeLocked, readRuntimeBuild } from './AssetRuntime.ts';

interface Owner {
  root?: string;
  pid: number;
  host: string;
  token: string;
  consumerPid?: number;
  consumers?: { pid: number; status: 'running' | 'finished' }[];
}

function ownerPath(root: string): string {
  return join(root, 'reports/assets/.write-lock/owner.json');
}

async function inheritedOwner(root: string): Promise<boolean> {
  const encoded = process.env.MGD_ASSET_SESSION;
  if (!encoded) return false;
  const inherited = JSON.parse(encoded) as Owner;
  if (inherited.root !== resolve(root)) return false;
  if (inherited.host !== hostname()) {
    throw new Error('Asset consumer inherited a session for a different host.');
  }
  const current = JSON.parse(await readFile(ownerPath(root), 'utf8')) as Owner;
  if (
    inherited.token !== current.token ||
    inherited.pid !== current.pid ||
    inherited.host !== current.host
  ) {
    throw new Error('Asset consumer session is no longer owned by its parent.');
  }
  if (
    inherited.consumerPid &&
    current.consumers?.some(
      (consumer) => consumer.pid === inherited.consumerPid && consumer.status === 'running',
    )
  ) {
    process.kill(inherited.consumerPid, 0);
  } else {
    process.kill(current.pid, 0);
  }
  return true;
}

/** Keep a single preparation/verification lock through a finite consumer. */
export async function openAssetSession(root: string): Promise<{ close: () => Promise<void> }> {
  await assetPath(root, 'reports/assets/.write-lock/owner.json', 'reports/assets');
  if (await inheritedOwner(root)) {
    await readRuntimeBuild(root);
    return {
      close: async () => {
        await readRuntimeBuild(root);
      },
    };
  }
  let release: () => void = () => {};
  const held = new Promise<void>((done) => {
    release = done;
  });
  let ready: () => void = () => {};
  let failed: (error: unknown) => void = () => {};
  const prepared = new Promise<void>((done, reject) => {
    ready = done;
    failed = reject;
  });
  const operation = withAssetLock(root, async () => {
    await buildRuntimeLocked(root);
    ready();
    await held;
    await readRuntimeBuild(root);
  });
  void operation.catch(failed);
  await prepared;
  return {
    close: async () => {
      release();
      await operation;
    },
  };
}

/** Wrap the actual tool, preserving its arguments, exit status and interruption. */
export async function runAssetConsumer(
  root: string,
  command: string,
  args: string[],
): Promise<number> {
  const session = await openAssetSession(root);
  try {
    const owner = JSON.parse(await readFile(ownerPath(root), 'utf8')) as Owner;
    const grant = join(root, `reports/assets/consumer-grant-${randomUUID()}`);
    const bootstrap = fileURLToPath(new URL('./AssetConsumer.ts', import.meta.url));
    const child = spawn(
      process.versions.bun ? process.execPath : 'bun',
      [bootstrap, root, owner.token, grant, command, JSON.stringify(args), String(owner.pid)],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          MGD_ASSET_SESSION: JSON.stringify({ ...owner, root: resolve(root) }),
        },
      },
    );
    const exited = new Promise<number>((done, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => done(code ?? (signal === 'SIGINT' ? 130 : 143)));
    });
    void exited.catch(() => {});
    const interrupt = () => {
      child.kill('SIGINT');
    };
    const terminate = () => {
      child.kill('SIGTERM');
    };
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    try {
      if (!child.pid) return await exited;
      await updateAssetConsumer(root, owner.token, child.pid, 'running');
      await writeFile(grant, 'registered', { flag: 'wx' });
      return await exited;
    } catch (error) {
      child.kill('SIGTERM');
      await exited.catch(() => {});
      throw error;
    } finally {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', terminate);
      await rm(grant, { force: true });
    }
  } finally {
    await session.close();
  }
}

/** Direct Vitest invocations receive the same guard as the package command. */
export default async function setup(): Promise<() => Promise<void>> {
  const session = await openAssetSession(process.cwd());
  return session.close;
}

/** Vite configs also protect direct builds and prepare direct dev starts. */
export function assetPipelinePlugin() {
  let root = process.cwd();
  let session: Awaited<ReturnType<typeof openAssetSession>> | undefined;
  let development = false;
  let marker: Owner | undefined;
  const markerFile = () => join(root, 'reports/assets/dev-server.json');
  return {
    name: 'mgd-asset-pipeline',
    async configResolved(config: { root: string; command: string; isPreview?: boolean }) {
      if (config.isPreview) return;
      root = config.root;
      development = config.command === 'serve';
      session = await openAssetSession(root);
      if (development) {
        marker = { pid: process.pid, host: hostname(), token: randomUUID() };
        await mkdir(join(root, 'reports/assets'), { recursive: true });
        try {
          await writeFile(markerFile(), JSON.stringify(marker), { flag: 'wx' });
        } catch (error) {
          await session.close();
          throw error;
        }
        await session.close();
        session = undefined;
      }
    },
    configureServer(server: {
      close: () => Promise<void>;
      restart: (force?: boolean) => Promise<void>;
    }) {
      const ownedMarker = marker;
      if (!ownedMarker) return;
      let removing: Promise<void> | undefined;
      const removeMarker = () =>
        (removing ??= (async () => {
          const current = JSON.parse(await readFile(markerFile(), 'utf8')) as Owner;
          if (current.token !== ownedMarker.token)
            throw new Error('Asset dev-server marker ownership changed.');
          await unlink(markerFile());
        })());
      const close = server.close.bind(server);
      server.close = async () => {
        await close();
        await removeMarker();
      };
      const restart = server.restart.bind(server);
      server.restart = async (force?: boolean) => {
        await server.close();
        await restart(force);
      };
    },
    async buildEnd(error?: Error) {
      if (error && session) {
        await session.close();
        session = undefined;
      }
    },
    async closeBundle() {
      if (session) {
        await session.close();
        session = undefined;
      }
      // Dev marker belongs to the complete awaited server.close lifecycle.
    },
  };
}
