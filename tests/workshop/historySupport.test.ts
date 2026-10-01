import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildHistorySupport } from '../../scripts/workshop/WorkshopHistory';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'mgd-workshop-history-'));
  roots.push(root);
  const source = join(root, 'workshop/src');
  const own = join(root, 'workshop/prototypes/example/v1');
  await mkdir(source, { recursive: true });
  await mkdir(own, { recursive: true });
  await Promise.all([
    writeFile(
      join(source, 'ui.ts'),
      'import type { Catalog } from "./catalog";\nexport const node = () => "historical node";',
    ),
    writeFile(
      join(source, 'download.ts'),
      'export const downloadText = () => "historical download";',
    ),
    writeFile(
      join(source, 'legacyStore.ts'),
      'import { workshopDrafts } from "./localSession";\nexport const legacyStore = workshopDrafts;',
    ),
    writeFile(
      join(source, 'ideaViews.ts'),
      `
      const button = (text: string, action: () => void) => node(text);
      export function unrelated(): void { throw new Error("not part of history"); }
      export function dataTransfer(data: Catalog): HTMLElement { return node("historical transfer"); }
      export function localNotes(ideaId: string): HTMLElement { return node("historical notes"); }
    `,
    ),
    writeFile(
      join(source, 'styles.css'),
      ':root { color-scheme: dark; font-family: historical; }\n.historical { color: red; }',
    ),
    writeFile(join(own, 'styles.css'), '.own { width: 32px; }'),
    writeFile(join(own, 'view.ts'), 'export function mountPilot() {}'),
  ]);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Workshop Test',
      '-c',
      'user.email=workshop@example.invalid',
      'commit',
      '-qm',
      'historical render support',
    ],
    { cwd: root },
  );
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return {
    root,
    source,
    own,
    version: {
      id: 'example-v1',
      sourceRevision: revision,
      renderSupportRevision: revision,
      sourcePaths: [
        'workshop/prototypes/example/v1/view.ts',
        'workshop/prototypes/example/v1/styles.css',
      ],
    },
  };
}

describe('historical Workshop rendering support', () => {
  it('keeps historical helpers and both styles stable after current shared sources change', async () => {
    const { root, source, own, version } = await fixture();
    const before = (await buildHistorySupport(root, [version]))[version.id];
    const originalUi = await readFile(before.ui, 'utf8');
    const originalFacade = await readFile(before.ideaViews, 'utf8');
    await Promise.all([
      writeFile(join(source, 'ui.ts'), 'export const node = () => "new rendering";'),
      writeFile(
        join(source, 'ideaViews.ts'),
        'export const replacement = "incompatible current rendering";',
      ),
      writeFile(join(source, 'styles.css'), '.historical { color: blue; }'),
      writeFile(join(own, 'styles.css'), '.own { width: 100px; }'),
    ]);
    const after = (await buildHistorySupport(root, [version]))[version.id];
    expect(await readFile(after.ui, 'utf8')).toBe(originalUi);
    expect(await readFile(after.ideaViews, 'utf8')).toBe(originalFacade);
    expect(after.styles).toBe(before.styles);
    expect(after.styles).toContain('color: red');
    expect(after.styles).toContain(':host { color-scheme: dark; font-family: historical; }');
    expect(after.styles).not.toContain(':root');
    expect(after.styles).toContain('width: 32px');
  });

  it('extracts only the required historical render functions and connects them to one live store', async () => {
    const { root, version } = await fixture();
    const support = (await buildHistorySupport(root, [version]))[version.id];
    const facade = await readFile(support.ideaViews, 'utf8');
    expect(facade).toContain('historical transfer');
    expect(facade).toContain('historical notes');
    expect(facade).not.toContain('not part of history');
    expect(facade).toContain('workshopDrafts as localDrafts');
    expect(facade).toContain(join(root, 'workshop/src/localSession.ts'));
    expect(facade).toContain(join(root, 'workshop/src/localData.ts'));
    const legacy = await readFile(
      join(root, 'workshop/.generated/history/example-v1/legacyStore.ts'),
      'utf8',
    );
    expect(legacy).toContain(join(root, 'workshop/src/localSession'));
    expect(legacy).not.toContain('new WorkshopDraftStore');
  });

  it('fails clearly when a bound revision is unavailable instead of using current source', async () => {
    const { root, version } = await fixture();
    await expect(
      buildHistorySupport(root, [{ ...version, renderSupportRevision: 'a'.repeat(40) }]),
    ).rejects.toThrow('Workshop-Historienquelle fehlt:');
  });

  it('provides a standalone adapter that isolates the original view with bound styles and cleanup', async () => {
    const { root, version } = await fixture();
    const support = (await buildHistorySupport(root, [version]))[version.id];
    expect(support.viewAdapter).not.toBeNull();
    const adapter = await readFile(support.viewAdapter as string, 'utf8');
    expect(adapter).toContain(join(root, 'workshop/prototypes/example/v1/view.ts'));
    expect(adapter).toContain('host.attachShadow({ mode: "open" })');
    expect(adapter).toContain('historyStyles("example-v1")');
    expect(adapter).toContain('shadow.append(style, mounted.element)');
    expect(adapter).toContain('dispose: () => mounted.dispose()');
  });

  it('rejects an undeclared mutable runtime helper while allowing erased catalog types', async () => {
    const { root, own, version } = await fixture();
    await writeFile(
      join(own, 'view.ts'),
      'import type { Catalog } from "../../../src/catalog";\nexport function mountPilot(data: Catalog) {}',
    );
    const draft = { ...version, sourceRevision: null };
    await expect(buildHistorySupport(root, [draft])).resolves.toHaveProperty(version.id);
    await writeFile(
      join(own, 'view.ts'),
      'import { mutableHelper } from "../../../src/newSharedHelper";\nexport function mountPilot() { mutableHelper(); }',
    );
    await expect(buildHistorySupport(root, [draft])).rejects.toThrow(
      'Ungebundene Workshop-Historiendependenz:',
    );
  });

  it('cannot bypass runtime binding through re-exports or dynamic imports', async () => {
    const { root, own, version } = await fixture();
    const draft = { ...version, sourceRevision: null };
    for (const source of [
      'export { node } from "../../../src/newSharedHelper";',
      'export * from "../../../src/newSharedHelper";',
    ]) {
      await writeFile(join(own, 'view.ts'), source);
      await expect(buildHistorySupport(root, [draft])).rejects.toThrow(
        'Ungebundene Workshop-Historiendependenz:',
      );
    }
    await writeFile(
      join(own, 'view.ts'),
      'export function mountPilot() { return import("../../../src/newSharedHelper"); }',
    );
    await expect(buildHistorySupport(root, [draft])).rejects.toThrow('dynamischer Import');
  });
});
