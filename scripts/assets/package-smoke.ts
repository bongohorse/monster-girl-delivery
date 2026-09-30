import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { openAssetSession } from './AssetEntrypoints.ts';
import { inspectRuntimePackage } from './AssetPackage.ts';

const execute = promisify(execFile);

/** Passive observer injected only by this test server, never into the shipped package. */
function observeImages(expected: { id: string; hash: string; width: number; height: number }[]) {
  const decoded = new Map<string, { id: string; hash: string; width: number; height: number }>();
  const errors: string[] = [];
  window.addEventListener('error', (event) => errors.push(event.message));
  window.addEventListener('unhandledrejection', (event) => errors.push(String(event.reason)));
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (!descriptor?.set) throw new Error('Native image src setter unavailable');
  const setter = descriptor.set;
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    ...descriptor,
    set(this: HTMLImageElement, value: string) {
      // Start reading before Phaser can revoke its Blob URL in its own load listener.
      const bytes = fetch(value).then((response) => response.arrayBuffer());
      void bytes.catch(() => {});
      this.addEventListener(
        'load',
        () => {
          void bytes
            .then((buffer) => crypto.subtle.digest('SHA-256', buffer))
            .then((digest) => {
              const hash = Array.from(new Uint8Array(digest), (byte) =>
                byte.toString(16).padStart(2, '0'),
              ).join('');
              for (const asset of expected.filter((candidate) => candidate.hash === hash)) {
                if (this.naturalWidth !== asset.width || this.naturalHeight !== asset.height) {
                  errors.push(`Decoded dimensions differ for ${asset.id}`);
                }
                decoded.set(asset.id, {
                  id: asset.id,
                  hash,
                  width: this.naturalWidth,
                  height: this.naturalHeight,
                });
              }
            })
            .catch((error: unknown) => errors.push(String(error)));
        },
        { once: true },
      );
      setter.call(this, value);
    },
  });
  const finish = (passed: boolean) => {
    document.documentElement.dataset.packageSmoke = passed ? 'passed' : 'failed';
    const result = document.createElement('pre');
    result.id = 'package-smoke-result';
    result.textContent = JSON.stringify({
      passed,
      pathname: location.pathname,
      bootReady: document.documentElement.dataset.mgdBootPhase === 'ready',
      decoded: [...decoded.values()],
      missing: expected.filter((asset) => !decoded.has(asset.id)).map((asset) => asset.id),
      errors,
    });
    document.body.append(result);
  };
  const started = performance.now();
  const poll = window.setInterval(() => {
    if (
      document.documentElement.dataset.mgdBootPhase === 'ready' &&
      document.querySelector('canvas') &&
      decoded.size === expected.length &&
      errors.length === 0
    ) {
      clearInterval(poll);
      finish(true);
    } else if (performance.now() - started > 10000) {
      clearInterval(poll);
      finish(false);
    }
  }, 100);
}

// Use real elapsed time: virtual-time budgets can outrun Phaser's GPU/animation-frame boot.
async function browserDom(
  chrome: string,
  url: string,
): Promise<{ stdout: string; stderr: string }> {
  const profile = await mkdtemp(resolve(tmpdir(), 'mgd-package-chrome-'));
  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1280,720',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '';
  child.stderr?.on('data', (bytes: Buffer) => {
    stderr += bytes.toString();
  });
  let processError: Error | undefined;
  child.once('error', (error) => {
    processError = error;
  });
  const exited = new Promise<void>((done) => child.once('close', () => done()));
  const watchdog = setTimeout(() => child.kill('SIGKILL'), 30000);
  let socket: WebSocket | undefined;
  try {
    const started = Date.now();
    let port: number | undefined;
    while (!port) {
      if (processError) throw processError;
      if (child.exitCode !== null || Date.now() - started > 10000)
        throw new Error(`Chrome startup failed: ${stderr}`);
      try {
        port = Number(
          (await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0],
        );
      } catch {
        await new Promise((done) => setTimeout(done, 50));
      }
    }
    const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as {
      webSocketDebuggerUrl: string;
    };
    socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise<void>((done, reject) => {
      socket?.addEventListener('open', () => done(), { once: true });
      socket?.addEventListener(
        'error',
        () => reject(new Error('Chrome debugger connection failed')),
        { once: true },
      );
    });
    let nextId = 0;
    const pending = new Map<
      number,
      { resolve: (result: Record<string, unknown>) => void; reject: (error: Error) => void }
    >();
    // Chrome DevTools Protocol is an external JSON boundary; narrow only the fields used below.
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        result?: Record<string, unknown>;
        error?: { message: string };
      };
      if (message.id === undefined) return;
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(message.error.message));
      else waiter?.resolve(message.result ?? {});
    });
    socket.addEventListener('close', () => {
      for (const waiter of pending.values()) waiter.reject(new Error('Chrome debugger closed'));
      pending.clear();
    });
    const command = (
      method: string,
      params: Record<string, unknown> = {},
      sessionId?: string,
    ): Promise<Record<string, unknown>> =>
      new Promise((done, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve: done, reject });
        socket?.send(JSON.stringify({ id, method, params, sessionId }));
      });
    const target = await command('Target.createTarget', { url: 'about:blank' });
    if (typeof target.targetId !== 'string') throw new Error('Chrome target missing');
    const attached = await command('Target.attachToTarget', {
      targetId: target.targetId,
      flatten: true,
    });
    if (typeof attached.sessionId !== 'string') throw new Error('Chrome session missing');
    const sessionId = attached.sessionId;
    await command('Page.enable', {}, sessionId);
    await command('Page.navigate', { url }, sessionId);
    const deadline = Date.now() + 15000;
    let stdout = '';
    while (Date.now() < deadline) {
      const evaluation = await command(
        'Runtime.evaluate',
        {
          expression:
            'JSON.stringify({status:document.documentElement.dataset.packageSmoke,html:document.documentElement.outerHTML})',
          returnByValue: true,
        },
        sessionId,
      );
      const result = evaluation.result as { value?: string } | undefined;
      if (typeof result?.value === 'string') {
        const page = JSON.parse(result.value) as { status?: string; html: string };
        stdout = page.html;
        if (page.status === 'passed' || page.status === 'failed') break;
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    return { stdout, stderr };
  } finally {
    socket?.close();
    child.kill('SIGKILL');
    await exited;
    clearTimeout(watchdog);
    await rm(profile, { recursive: true, force: true });
  }
}

async function main() {
  const root = resolve('.');
  const packageDirectory = resolve(process.argv[2] ?? 'dist');
  const chrome = process.env.MGD_CHROME_PATH;
  if (!chrome) throw new Error('Set MGD_CHROME_PATH to the installed Chrome/Chromium executable.');
  const reports = resolve('reports/browser-runtime-smoke/package');
  await mkdir(reports, { recursive: true });
  const session = await openAssetSession(root);
  try {
    const inspected = await inspectRuntimePackage(root, packageDirectory);
    const probe = `<script>(${observeImages.toString()})(${JSON.stringify(inspected.assets)});</script>`;
    const mime: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.json': 'application/json',
      '.webmanifest': 'application/manifest+json',
    };
    const requests: { path: string; status: number }[] = [];
    let mount = '/';
    const server = createServer(async (request, response) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      try {
        if (!pathname.startsWith(mount)) throw new Error('Outside package mount');
        const relative = decodeURIComponent(pathname.slice(mount.length)) || 'index.html';
        const filename = resolve(packageDirectory, relative);
        if (!filename.startsWith(`${packageDirectory}${sep}`)) throw new Error('Outside package');
        const bytes = await readFile(filename);
        response.writeHead(200, {
          'Content-Type': mime[extname(filename)] ?? 'application/octet-stream',
        });
        requests.push({ path: pathname, status: 200 });
        response.end(
          relative === 'index.html' ? bytes.toString().replace('<head>', `<head>${probe}`) : bytes,
        );
      } catch {
        requests.push({ path: pathname, status: 404 });
        response.writeHead(404);
        response.end('Not found');
      }
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing HTTP port');
      const results: unknown[] = [];
      for (const [name, prefix] of [
        ['root', '/'],
        ['subpath', '/mgd-package-pilot/'],
      ]) {
        mount = prefix;
        requests.length = 0;
        const { stdout, stderr } = await browserDom(
          chrome,
          `http://127.0.0.1:${address.port}${prefix}`,
        );
        await writeFile(resolve(reports, `${name}-dom.html`), stdout);
        await writeFile(resolve(reports, `${name}-chrome.log`), stderr);
        const encoded = stdout.match(/<pre id="package-smoke-result">([^<]*)<\/pre>/)?.[1];
        const evidence: unknown = encoded
          ? JSON.parse(encoded.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
          : null;
        results.push({ mount, evidence, requests: [...requests] });
        await writeFile(
          resolve(reports, 'summary.json'),
          `${JSON.stringify(
            {
              commit:
                process.env.GITHUB_SHA ??
                (await execute('git', ['rev-parse', 'HEAD'])).stdout.trim(),
              chrome: (await execute(chrome, ['--version'])).stdout.trim(),
              platform: process.platform,
              package: inspected,
              results,
              scope:
                'Actual production app boot and Phaser image decoding; no device/art acceptance.',
            },
            null,
            2,
          )}\n`,
        );
        if (
          !stdout.includes('data-package-smoke="passed"') ||
          requests.some((entry) => entry.status === 404 && !entry.path.endsWith('/favicon.ico'))
        ) {
          throw new Error(`Production package smoke failed at ${prefix}; see ${reports}`);
        }
      }
      console.log(
        `Production Phaser loader passed at / and /mgd-package-pilot/: ${inspected.assets.map((asset) => asset.id).join(', ')}`,
      );
    } finally {
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
  } finally {
    await session.close();
  }
}

await main();
