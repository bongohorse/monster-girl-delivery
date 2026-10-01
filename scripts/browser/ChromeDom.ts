import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// Use real elapsed time: virtual-time budgets can outrun Phaser's GPU/animation-frame boot.
export async function browserDom(
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
