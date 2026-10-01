import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// Use real elapsed time: virtual-time budgets can outrun Phaser's GPU/animation-frame boot.
export async function browserDom(
  chrome: string,
  url: string,
  failureReport?: string,
): Promise<{ stdout: string; stderr: string }> {
  const launchedAt = Date.now();
  let phase = 'startup';
  let portContents: string | undefined;
  let portReadError: string | undefined;
  let navigation: Record<string, unknown> | undefined;
  let lastPage: { status?: string; url: string; readyState: string } | undefined;
  const processEvents: {
    event: string;
    elapsedMs: number;
    code?: number | null;
    signal?: string | null;
  }[] = [];
  const recordProcess = (event: string, code?: number | null, signal?: string | null) => {
    processEvents.push({ event, elapsedMs: Date.now() - launchedAt, code, signal });
  };
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
  let stderrBytes = 0;
  child.stderr?.on('data', (bytes: Buffer) => {
    stderrBytes += bytes.length;
    stderr = (stderr + bytes.toString()).slice(-16384);
  });
  let processError: Error | undefined;
  child.once('spawn', () => recordProcess('spawn'));
  child.once('error', (error) => {
    processError = error;
    recordProcess('error');
  });
  child.once('exit', (code, signal) => recordProcess('exit', code, signal));
  const exited = new Promise<void>((done) =>
    child.once('close', (code, signal) => {
      recordProcess('close', code, signal);
      done();
    }),
  );
  const watchdog = setTimeout(() => {
    recordProcess('watchdog');
    child.kill('SIGKILL');
  }, 30000);
  let socket: WebSocket | undefined;
  try {
    const started = Date.now();
    let port: number | undefined;
    while (!port) {
      if (processError) throw processError;
      if (child.exitCode !== null || Date.now() - started > 10000)
        throw new Error(`Chrome startup failed: ${stderr}`);
      try {
        portContents = await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8');
        port = Number(portContents.split('\n')[0]);
        portReadError = undefined;
      } catch (error) {
        portReadError = String(error);
        await new Promise((done) => setTimeout(done, 50));
      }
    }
    phase = 'debugger-connect';
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
    phase = 'navigation';
    navigation = await command('Page.navigate', { url }, sessionId);
    phase = 'page-condition';
    const deadline = Date.now() + 15000;
    let stdout = '';
    while (Date.now() < deadline) {
      const evaluation = await command(
        'Runtime.evaluate',
        {
          expression:
            'JSON.stringify({status:document.documentElement.dataset.packageSmoke,url:location.href,readyState:document.readyState,html:document.documentElement.outerHTML})',
          returnByValue: true,
        },
        sessionId,
      );
      const result = evaluation.result as { value?: string } | undefined;
      if (typeof result?.value === 'string') {
        const page = JSON.parse(result.value) as {
          status?: string;
          url: string;
          readyState: string;
          html: string;
        };
        lastPage = { status: page.status, url: page.url, readyState: page.readyState };
        stdout = page.html;
        if (page.status === 'passed' || page.status === 'failed') break;
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    return { stdout, stderr };
  } catch (error) {
    let processState: string;
    try {
      processState =
        child.pid === undefined
          ? 'No PID'
          : execFileSync('ps', ['-o', 'pid,ppid,stat,etime,comm', '-p', String(child.pid)], {
              encoding: 'utf8',
              timeout: 1000,
            }).trim();
    } catch {
      processState = 'Process absent or ps unavailable';
    }
    const report = JSON.stringify(
      {
        error: String(error).slice(-16384),
        phase,
        url,
        elapsedMs: Date.now() - launchedAt,
        pid: child.pid,
        exitCode: child.exitCode,
        signalCode: child.signalCode,
        killed: child.killed,
        processEvents,
        processState,
        portContents: portContents?.slice(0, 256),
        portReadError,
        navigation,
        lastPage,
        stderrBytes,
        stderrTail: stderr.slice(-16384),
      },
      null,
      2,
    );
    console.error(`Chrome failure diagnostic (before cleanup): ${report}`);
    if (failureReport) {
      try {
        await writeFile(failureReport, `${report}\n`);
      } catch (writeError) {
        console.error(`Could not save Chrome diagnostic: ${String(writeError)}`);
      }
    }
    throw error;
  } finally {
    socket?.close();
    child.kill('SIGKILL');
    await exited;
    clearTimeout(watchdog);
    await rm(profile, { recursive: true, force: true });
  }
}
