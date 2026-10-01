import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseAst } from 'rolldown/parseAst';
import { normalizePath, type Plugin } from 'vite';
import type { PrototypeVersion } from '../../workshop/src/catalog.ts';

type HistoryVersion = Pick<PrototypeVersion, 'id' | 'sourceRevision' | 'sourcePaths'> & {
  renderSupportRevision: string | null;
};
interface HistorySupport {
  ui: string;
  ideaViews: string;
  localSession: string;
  viewAdapter: string | null;
  styles: string;
}
const virtualModule = 'virtual:workshop-history';
const resolvedVirtualModule = `\0${virtualModule}`;

function containsDynamicImport(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(containsDynamicImport);
  if (!node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  return record.type === 'ImportExpression' || Object.values(record).some(containsDynamicImport);
}

async function sourceAt(root: string, path: string, revision: string | null): Promise<string> {
  if (revision !== null && !/^[a-f0-9]{40}$/.test(revision))
    throw new Error(`Ungültige Workshop-Historienrevision: ${revision} (${path})`);
  try {
    return revision === null
      ? await readFile(join(root, path), 'utf8')
      : execFileSync('git', ['show', `${revision}:${path}`], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
  } catch {
    throw new Error(`Workshop-Historienquelle fehlt: ${path} @ ${revision ?? 'Arbeitsstand'}`);
  }
}

/** The scene's runtime closure may only cross the fixed, revision-bound support facade. */
async function assertBoundSceneImports(root: string, version: HistoryVersion): Promise<void> {
  const own = new Set(version.sourcePaths.map((path) => normalizePath(resolve(root, path))));
  const shared = new Set(
    ['ui.ts', 'ideaViews.ts', 'localSession.ts'].map((name) =>
      normalizePath(resolve(root, 'workshop/src', name)),
    ),
  );
  for (const path of version.sourcePaths) {
    if (!path.endsWith('.ts') || path.endsWith('/entry.ts')) continue;
    const text = await sourceAt(root, path, version.sourceRevision);
    const ast = parseAst(text, { lang: 'ts' }, path);
    if (containsDynamicImport(ast))
      throw new Error(
        `Nicht unterstützte Workshop-Historiendependenz: dynamischer Import in ${path} (${version.id})`,
      );
    for (const statement of ast.body) {
      let imported: string;
      if (statement.type === 'ImportDeclaration') {
        if (statement.importKind === 'type') continue;
        // `import { type Catalog }` is erased too, but a side-effect import is runtime.
        if (
          statement.specifiers.length &&
          statement.specifiers.every(
            (specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type',
          )
        )
          continue;
        imported = statement.source.value;
      } else if (statement.type === 'ExportAllDeclaration') {
        if (statement.exportKind === 'type') continue;
        imported = statement.source.value;
      } else if (statement.type === 'ExportNamedDeclaration' && statement.source) {
        if (
          statement.exportKind === 'type' ||
          (statement.specifiers.length &&
            statement.specifiers.every((specifier) => specifier.exportKind === 'type'))
        )
          continue;
        imported = statement.source.value;
      } else continue;
      const target = imported.startsWith('.')
        ? normalizePath(resolve(root, dirname(path), imported))
        : null;
      const candidates = target ? [target, `${target}.ts`, `${target}.css`] : [];
      if (!candidates.some((candidate) => own.has(candidate) || shared.has(candidate)))
        throw new Error(
          `Ungebundene Workshop-Historiendependenz: ${path} → ${imported} (${version.id})`,
        );
    }
  }
}

/** Preserve source text from the parsed declarations, including TypeScript annotations. */
function historicalNotesFacade(source: string, root: string): string {
  const body = parseAst(source, { lang: 'ts' }, 'ideaViews.ts').body;
  const button = body.find(
    (statement) =>
      statement.type === 'VariableDeclaration' &&
      statement.declarations.length === 1 &&
      statement.declarations[0].id.type === 'Identifier' &&
      statement.declarations[0].id.name === 'button',
  );
  const helpers = ['dataTransfer', 'localNotes'].map((name) => {
    const statement = body.find(
      (item) =>
        item.type === 'ExportNamedDeclaration' &&
        item.declaration?.type === 'FunctionDeclaration' &&
        item.declaration.id?.name === name,
    );
    if (!statement) throw new Error(`Workshop-Historienfunktion fehlt: ideaViews.${name}`);
    if (name !== 'dataTransfer') return source.slice(statement.start, statement.end);
    const id =
      statement.type === 'ExportNamedDeclaration' &&
      statement.declaration?.type === 'FunctionDeclaration' &&
      statement.declaration.id;
    if (!id) throw new Error('Workshop-Historienimportfunktion fehlt');
    // Wrap the live import transport while retaining the historical form and scene sources.
    return `${source.slice(statement.start, id.start)}historicalDataTransfer${source.slice(id.end, statement.end)}
export function dataTransfer(data: Catalog, refresh: () => void = () => {}, currentConfig?: () => LocalConfiguration): HTMLElement {
  return historicalDataTransfer(data, () => {
    if (currentConfig) {
      const hash = importedVariantHash(localDrafts.snapshot(), currentConfig().versionId, location.hash);
      history.replaceState(null, '', location.pathname + location.search + hash);
    }
    refresh();
  }, currentConfig);
}`;
  });
  if (!button) throw new Error('Workshop-Historienfunktion fehlt: ideaViews.button');
  const live = (name: string) => JSON.stringify(normalizePath(join(root, `workshop/src/${name}`)));
  return [
    'import { node } from "./ui.ts";',
    'import { downloadText } from "./download.ts";',
    `import type { Catalog } from ${live('catalog.ts')};`,
    `import { type LocalConfiguration, maxImportBytes, parseLocalData, serializeLocalData } from ${live('localData.ts')};`,
    `import { workshopDrafts as localDrafts } from ${live('localSession.ts')};`,
    `import { importedVariantHash } from ${live('prototypeConfiguration.ts')};`,
    source.slice(button.start, button.end),
    ...helpers,
  ].join('\n\n');
}

/** Archived support keeps its implementation but connects to the one live storage transport. */
function connectLiveImports(source: string, root: string, originalPath: string): string {
  const imports = parseAst(source, { lang: 'ts' }, originalPath).body.filter(
    (statement) => statement.type === 'ImportDeclaration' && statement.source.value.startsWith('.'),
  );
  let result = source;
  // Descending edits retain all original source positions.
  for (const statement of imports.reverse()) {
    if (statement.type !== 'ImportDeclaration') continue;
    const target = normalizePath(resolve(root, dirname(originalPath), statement.source.value));
    result = `${result.slice(0, statement.source.start)}${JSON.stringify(target)}${result.slice(statement.source.end)}`;
  }
  return result;
}

/** A fixed facade snapshots rendering support without archiving the evolving bundle/store. */
export async function buildHistorySupport(
  root: string,
  versions: HistoryVersion[],
): Promise<Record<string, HistorySupport>> {
  const entries = await Promise.all(
    versions.map(async (version) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(version.id))
        throw new Error(`Ungültige Workshop-Historien-ID: ${version.id}`);
      await assertBoundSceneImports(root, version);
      const revision = version.renderSupportRevision;
      const ownStylesPath = version.sourcePaths.find((path) => path.endsWith('/styles.css'));
      const [ui, download, ideaViews, legacyStore, rootStyles, ownStyles] = await Promise.all([
        sourceAt(root, 'workshop/src/ui.ts', revision),
        sourceAt(root, 'workshop/src/download.ts', revision),
        sourceAt(root, 'workshop/src/ideaViews.ts', revision),
        sourceAt(root, 'workshop/src/legacyStore.ts', revision),
        sourceAt(root, 'workshop/src/styles.css', revision),
        ownStylesPath ? sourceAt(root, ownStylesPath, version.sourceRevision) : Promise.resolve(''),
      ]);
      const directory = join(root, 'workshop/.generated/history', version.id);
      const viewPath = version.sourcePaths.find((path) => path.endsWith('/view.ts'));
      const files = {
        'ui.ts': connectLiveImports(ui, root, 'workshop/src/ui.ts'),
        'download.ts': download,
        'ideaViews.ts': historicalNotesFacade(ideaViews, root),
        'legacyStore.ts': connectLiveImports(legacyStore, root, 'workshop/src/legacyStore.ts'),
        'localSession.ts': [
          'export { legacyStore as localDrafts } from "./legacyStore.ts";',
          `export { workshopDrafts } from ${JSON.stringify(normalizePath(join(root, 'workshop/src/localSession.ts')))};`,
          '',
        ].join('\n'),
        ...(viewPath
          ? {
              'viewAdapter.ts': [
                `import { mountPilot as mountOriginal } from ${JSON.stringify(normalizePath(join(root, viewPath)))};`,
                'import { historyStyles } from "virtual:workshop-history";',
                'export function mountPilot(data, refresh) {',
                '  const mounted = mountOriginal(data, refresh);',
                '  const host = document.createElement("section");',
                '  host.className = "prototype-host";',
                '  const shadow = host.attachShadow({ mode: "open" });',
                '  const style = document.createElement("style");',
                `  style.textContent = historyStyles(${JSON.stringify(version.id)});`,
                '  const frame = document.createElement("div");',
                '  frame.className = "workshop-history-frame";',
                '  frame.append(mounted.element);',
                '  shadow.append(style, frame);',
                '  return { element: host, dispose: () => mounted.dispose() };',
                '}',
                '',
              ].join('\n'),
            }
          : {}),
      };
      await mkdir(directory, { recursive: true });
      await Promise.all(
        Object.entries(files).map(([name, text]) => writeFile(join(directory, name), text)),
      );
      return [
        version.id,
        {
          ui: normalizePath(join(directory, 'ui.ts')),
          ideaViews: normalizePath(join(directory, 'ideaViews.ts')),
          localSession: normalizePath(join(directory, 'localSession.ts')),
          viewAdapter: viewPath ? normalizePath(join(directory, 'viewAdapter.ts')) : null,
          // Reset inherited defaults inside the shadow so current outer typography cannot leak in.
          // rem otherwise follows the live document root even inside a shadow tree.
          styles:
            `.workshop-history-frame { all: initial; display: block; font-size: 16px; line-height: normal; direction: ltr; }\n${rootStyles.replace(/:root\b/g, '.workshop-history-frame')}\n\n${ownStyles}`.replace(
              /(-?(?:\d*\.\d+|\d+))rem\b/g,
              (_match, value: string) => `${Number(value) * 16}px`,
            ),
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function workshopHistoryPlugin(root: string, data: { versions: HistoryVersion[] }): Plugin {
  let support: Record<string, HistorySupport> = {};
  const normalizedRoot = normalizePath(resolve(root));
  return {
    name: 'workshop-history-support',
    enforce: 'pre',
    async configResolved() {
      support = await buildHistorySupport(root, data.versions);
    },
    resolveId(source, importer) {
      if (source === virtualModule) return resolvedVirtualModule;
      if (!importer || !source.startsWith('.')) return;
      const cleanImporter = normalizePath(importer.split('?')[0]);
      const version = data.versions.find((item) =>
        item.sourcePaths.some((path) => `${normalizedRoot}/${path}` === cleanImporter),
      );
      if (!version) return;
      const target = normalizePath(resolve(dirname(cleanImporter), source)).replace(/\.ts$/, '');
      const ownView = version.sourcePaths.find((path) => path.endsWith('/view.ts'));
      if (
        cleanImporter.endsWith('/entry.ts') &&
        ownView &&
        target === `${normalizedRoot}/${ownView.replace(/\.ts$/, '')}`
      ) {
        return support[version.id].viewAdapter;
      }
      for (const name of ['ui', 'ideaViews', 'localSession'] as const) {
        if (target === `${normalizedRoot}/workshop/src/${name}`) return support[version.id][name];
      }
    },
    load(id) {
      if (id !== resolvedVirtualModule) return;
      const styles = Object.fromEntries(
        Object.entries(support).map(([key, value]) => [key, value.styles]),
      );
      return `const styles = ${JSON.stringify(styles)};\nexport function historyStyles(versionId) { if (!Object.prototype.hasOwnProperty.call(styles, versionId)) throw new Error('Workshop-Historienstil fehlt: ' + versionId); return styles[versionId]; }`;
    },
  };
}
