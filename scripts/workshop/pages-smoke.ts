import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { catalog } from '../../workshop/src/catalog.ts';
import { browserDom } from '../browser/ChromeDom.ts';

// Injected by the test server only; never included in either production application.
async function observePages(mount: string, versionId: string | null) {
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  const proof: Record<string, unknown> = {};
  const assert = (ok: unknown, message: string) => {
    if (!ok) throw new Error(message);
  };
  const wait = async (test: () => unknown) => {
    const deadline = Date.now() + 5000;
    while (!test()) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for Pages UI');
      await new Promise((done) => setTimeout(done, 30));
    }
  };
  const shadow = () => document.querySelector('.prototype-host')?.shadowRoot;
  const find = (selector: string) =>
    document.querySelector(selector) ?? shadow()?.querySelector(selector);
  const button = (label: string) => {
    const buttons = [
      ...document.querySelectorAll('button'),
      ...(shadow()?.querySelectorAll('button') ?? []),
    ];
    const found = buttons.find((b) => b.textContent === label);
    assert(found, `Missing button: ${label}`);
    found?.click();
  };
  const input = (selector: string, value: string) => {
    const field = find(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    assert(field, `Missing control: ${selector}`);
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const state = async () => ({
    controller: navigator.serviceWorker.controller?.scriptURL ?? null,
    registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope),
    caches: await caches.keys(),
  });
  const finish = (passed: boolean) => {
    document.documentElement.dataset.packageSmoke = passed ? 'passed' : 'failed';
    const result = document.createElement('pre');
    result.id = 'pages-smoke-result';
    result.textContent = JSON.stringify({
      passed,
      pathname: location.pathname,
      versionId,
      proof,
      errors,
    });
    document.body.append(result);
  };
  try {
    await wait(
      () =>
        find('.pilot-scene') || find('.pickup-scene') || document.querySelector('.category-card'),
    );
    proof.before = await state();
    assert(
      !navigator.serviceWorker.controller &&
        (await navigator.serviceWorker.getRegistrations()).length === 0 &&
        (await caches.keys()).length === 0,
      'Unexpected Worker/CacheStorage at Workshop',
    );
    assert(
      !document.querySelector('link[rel="manifest"]'),
      'Workshop must not install a game manifest',
    );
    if (versionId) {
      assert(shadow(), 'Standalone must use bound historical rendering');
      const scene = find('.pilot-scene') ?? find('.pickup-scene');
      assert(scene, 'Standalone scene missing');
      button('Play');
      await new Promise((done) => setTimeout(done, 120));
      button('Pause');
      proof.standalone = {
        scene: scene?.tagName,
        controls: shadow()?.querySelectorAll('input').length,
      };
    } else {
      const game = document.createElement('iframe');
      game.style.cssText = 'position:absolute;left:-10000px;width:1280px;height:720px';
      game.src = mount;
      document.body.append(game);
      await wait(() => game.contentDocument?.documentElement.dataset.mgdBootPhase === 'ready');
      assert(game.contentDocument?.querySelector('canvas'), 'Composed game did not boot');
      assert(
        !game.contentWindow?.navigator.serviceWorker.controller,
        'Game worker must not control Workshop',
      );
      proof.gameBoot = true;
      game.remove();
      const keys = [
        'mgd:diagnostics-enabled',
        'mgd:last-performance-evidence',
        'mgd:last-memory-evidence',
      ];
      const original = keys.map((key) => localStorage.getItem(key));
      keys.forEach((key, i) => {
        localStorage.setItem(key, i === 0 ? 'false' : '{"pagesProbe":true}');
      });
      const saved = keys.map((key) => localStorage.getItem(key));
      const route = async (path: string, selector: string) => {
        location.hash = path;
        await wait(() => find(selector));
      };
      await route('/element/red-missile', '[role="tab"]');
      const gallery = [...document.querySelectorAll('[role="tab"]')].find(
        (t) => t.textContent === 'Galerie / Medien',
      ) as HTMLElement;
      gallery.click();
      await wait(() => document.querySelector('.asset-card'));
      await route('/asset/red-monster-missile', '.artifact-panel');
      await wait(() =>
        [...document.querySelectorAll('img')].some((image) => image.naturalWidth > 0),
      );
      proof.gallery = true;
      await route('/version/pickup-ring-v1', '.pickup-scene');
      input('[name="radius"]', '32');
      input('[name="duration"]', '0.6');
      input('[name="scrubber"]', '0.3');
      assert(
        find('.pickup-scene circle')?.getAttribute('r') === '16',
        'Independent controls have no effect',
      );
      button('Share-Link erzeugen');
      const share = (find('[name="share-link"]') as HTMLInputElement).value;
      assert(
        share.includes('radius=32') && share.includes('duration=0.6'),
        'Share loses independent values',
      );
      input('[name="note"]', 'Pages roundtrip');
      button('Notiz lokal speichern');
      const bundle = localStorage.getItem('mgd:workshop:v1:local');
      assert(bundle?.includes('Pages roundtrip'), 'Local note not persisted');
      const imported = JSON.parse(bundle ?? '{}');
      imported.presets.push({
        id: 'pages-exported-preview',
        name: 'Exportierte Vorschau',
        ideaId: 'pickup-ring-study',
        versionId: 'pickup-ring-v1',
        variantId: 'disc',
        values: { radius: 32, duration: 0.6 },
        date: '2026-10-01T12:00:00.000Z',
      });
      input('[name="local-json"]', JSON.stringify(imported));
      button('JSON importieren und lokale Daten ersetzen');
      await wait(() => find('.pickup-scene')?.getAttribute('data-variant') === 'disc');
      assert(
        find('.pickup-scene')?.getAttribute('data-values') === '{"radius":32,"duration":0.6}',
        'Imported concept loses its effective values',
      );
      proof.importedConcept = true;
      const importedBundle = localStorage.getItem('mgd:workshop:v1:local');
      input('[name="local-json"]', '{broken');
      button('JSON importieren und lokale Daten ersetzen');
      assert(
        localStorage.getItem('mgd:workshop:v1:local') === importedBundle,
        'Invalid import changed data',
      );
      input('[name="local-json"]', importedBundle ?? '');
      button('JSON importieren und lokale Daten ersetzen');
      await wait(() => find('.pickup-scene'));
      assert(
        localStorage.getItem('mgd:workshop:v1:local') === importedBundle,
        'JSON roundtrip changed data',
      );
      assert(
        keys.every((key, i) => localStorage.getItem(key) === saved[i]),
        'Workshop changed game storage',
      );
      keys.forEach((key, i) => {
        if (original[i] === null) localStorage.removeItem(key);
        else localStorage.setItem(key, original[i] ?? '');
      });
      proof.storageIsolation = true;
      proof.independentShare = share;
      await route('/compare/delivery-arrow-study', '.arrow-comparison');
      input('[name="comparison-time"]', '5.25');
      button('B · v2');
      assert(
        find('.arrow-comparison svg')?.getAttribute('data-seconds') === '5.25',
        'A/B loses common time',
      );
      proof.comparison = true;
      await route('/search?query=GPS', '.search-results');
      assert(
        document.querySelector('a[href="#/element/delivery-arrow"]'),
        'Search lost catalogue link',
      );
      proof.search = true;
      assert(document.documentElement.scrollWidth <= innerWidth, 'Workshop horizontal overflow');
    }
    proof.after = await state();
    assert(
      !navigator.serviceWorker.controller &&
        (await navigator.serviceWorker.getRegistrations()).length === 0 &&
        (await caches.keys()).length === 0,
      'Workshop created a Worker/CacheStorage',
    );
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    finish(true);
  } catch (error) {
    errors.push(String(error));
    finish(false);
  }
}

async function main() {
  const directory = resolve(process.argv[2] ?? 'dist-pages');
  const chrome = process.env.MGD_CHROME_PATH;
  if (!chrome) throw new Error('Set MGD_CHROME_PATH to Chrome/Chromium.');
  const reports = resolve('reports/browser-runtime-smoke/pages');
  await mkdir(reports, { recursive: true });
  const requests: { path: string; status: number }[] = [];
  const mime: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
  };
  const mount = '/monster-girl-delivery/';
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    try {
      if (!pathname.startsWith(mount)) throw new Error('Outside Pages mount');
      const relative = decodeURIComponent(pathname.slice(mount.length));
      const file = resolve(
        directory,
        !relative || relative.endsWith('/') ? `${relative}index.html` : relative,
      );
      if (!file.startsWith(`${directory}${sep}`)) throw new Error('Outside package');
      const bytes = await readFile(file);
      const version = catalog.versions.find((v) => `workshop/${v.entry}` === relative);
      const workshopRoot = relative === 'workshop/' || relative === 'workshop/index.html';
      const probe = `<script>(${observePages.toString()})(${JSON.stringify(mount)},${JSON.stringify(version?.id ?? null)});</script>`;
      response.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      });
      requests.push({ path: pathname, status: 200 });
      response.end(
        workshopRoot || version ? bytes.toString().replace('<head>', `<head>${probe}`) : bytes,
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
    if (!address || typeof address === 'string') throw new Error('Missing server address');
    const results: unknown[] = [];
    for (const [id, path] of [['workshop', ''], ...catalog.versions.map((v) => [v.id, v.entry])]) {
      requests.length = 0;
      const { stdout, stderr } = await browserDom(
        chrome,
        `http://127.0.0.1:${address.port}${mount}workshop/${path}`,
        resolve(reports, `${id}-chrome-failure.json`),
      );
      await writeFile(resolve(reports, `${id}-dom.html`), stdout);
      await writeFile(resolve(reports, `${id}-chrome.log`), stderr);
      const encoded = stdout.match(/<pre id="pages-smoke-result">([^<]*)<\/pre>/)?.[1];
      const evidence: unknown = encoded
        ? JSON.parse(encoded.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        : null;
      results.push({ id, evidence, requests: [...requests] });
      const summary = {
        commit:
          process.env.GITHUB_SHA ??
          execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        prHeadCommit: process.env.MGD_PR_HEAD_SHA ?? null,
        chrome: execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim(),
        mount,
        results,
        scope:
          'Composed production package on loopback, real Chromium. No live publication or installed-device acceptance.',
      };
      await writeFile(resolve(reports, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
      if (
        !stdout.includes('data-package-smoke="passed"') ||
        requests.some((r) => r.status === 404 && !r.path.endsWith('/favicon.ico'))
      )
        throw new Error(`Pages smoke failed for ${id}; see ${reports}`);
    }
  } finally {
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  }
  console.log(
    'Composed Pages game, Workshop, historical standalones, storage and Worker/CacheStorage checks passed.',
  );
}
await main();
