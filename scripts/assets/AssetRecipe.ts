import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export interface AssetRecipe {
  schemaVersion: 1;
  id: string;
  source: string;
  sourceHash: string;
  provenance: string;
  state: 'prepared' | 'active';
  profile: 'static-png' | 'pass-through';
  canvas: {
    width: number;
    height: number;
    padding: number;
    sampling: 'nearest' | 'lanczos3';
    trimAlpha: number | null;
  };
  pivot: { x: number; y: number };
  display: { width: number; height: number; renderScale: number };
}

export const sha256 = (bytes: string | Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function assertAssetId(id: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 80) {
    throw new Error('Asset ID must be lowercase words separated by hyphens (max 80 characters).');
  }
}

/** All owned paths are relative, case-exact and free of symlink traversal. */
export async function assetPath(root: string, name: string, area: string): Promise<string> {
  if (
    isAbsolute(name) ||
    name.includes('\\') ||
    name.split('/').some((part) => !part || part === '.' || part === '..') ||
    !name.startsWith(`${area}/`)
  ) {
    throw new Error(`Invalid asset path in ${area}: ${name}`);
  }
  const target = resolve(root, name);
  const rel = relative(resolve(root), target);
  if (rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error(`Path escapes checkout: ${name}`);
  let cursor = resolve(root);
  for (const part of name.split('/')) {
    try {
      const entries = await readdir(cursor);
      if (entries.some((entry) => entry.toLowerCase() === part.toLowerCase() && entry !== part)) {
        throw new Error(`Asset paths must match filename case: ${name}`);
      }
      cursor = join(cursor, part);
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink())
        throw new Error(`Symlinks are not supported in owned asset paths: ${name}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }
  return target;
}

function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid ${label}.`);
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some((key) => !keys.includes(key)) ||
    keys.some((key) => !(key in record))
  ) {
    throw new Error(`Invalid or missing fields in ${label}: expected ${keys.join(', ')}.`);
  }
  return record;
}

function number(value: unknown, min: number, max: number, integer = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`Expected ${integer ? 'integer' : 'number'} in ${min}..${max}.`);
  }
  return value;
}

export function parseRecipe(value: unknown, id: string): AssetRecipe {
  const r = object(
    value,
    [
      'schemaVersion',
      'id',
      'source',
      'sourceHash',
      'provenance',
      'state',
      'profile',
      'canvas',
      'pivot',
      'display',
    ],
    'recipe',
  );
  assertAssetId(id);
  if (r.schemaVersion !== 1) throw new Error('Unsupported asset recipe schemaVersion; expected 1.');
  if (r.id !== id) throw new Error('Recipe ID does not match its filename.');
  if (
    typeof r.source !== 'string' ||
    typeof r.sourceHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(r.sourceHash)
  )
    throw new Error('Invalid source path/hash.');
  if (typeof r.provenance !== 'string' || !r.provenance.trim() || r.provenance.length > 1024)
    throw new Error('Record provenance (or explicitly unresolved origin), max 1024 characters.');
  if (r.state !== 'prepared' && r.state !== 'active')
    throw new Error('Asset state must be prepared or active.');
  if (r.profile !== 'static-png' && r.profile !== 'pass-through')
    throw new Error('Unknown asset profile.');
  const c = object(r.canvas, ['width', 'height', 'padding', 'sampling', 'trimAlpha'], 'canvas');
  const width = number(c.width, 1, 4096, true);
  const height = number(c.height, 1, 4096, true);
  const padding = number(c.padding, 0, 2047, true);
  if (padding * 2 >= Math.min(width, height)) throw new Error('Padding leaves no drawable canvas.');
  if (c.sampling !== 'nearest' && c.sampling !== 'lanczos3')
    throw new Error('Unknown sampling mode.');
  const trimAlpha = c.trimAlpha === null ? null : number(c.trimAlpha, 0, 254, true);
  const p = object(r.pivot, ['x', 'y'], 'pivot');
  const d = object(r.display, ['width', 'height', 'renderScale'], 'display');
  const recipe: AssetRecipe = {
    schemaVersion: 1,
    id,
    source: r.source,
    sourceHash: r.sourceHash,
    provenance: r.provenance,
    state: r.state,
    profile: r.profile,
    canvas: { width, height, padding, sampling: c.sampling, trimAlpha },
    pivot: { x: number(p.x, 0, 1), y: number(p.y, 0, 1) },
    display: {
      width: number(d.width, 1, 4096),
      height: number(d.height, 1, 4096),
      renderScale: number(d.renderScale, 1, 2),
    },
  };
  if (recipe.profile === 'pass-through' && (padding !== 0 || trimAlpha !== null))
    throw new Error('Pass-through cannot trim or pad.');
  return recipe;
}

export const recipePath = async (root: string, id: string): Promise<string> => {
  assertAssetId(id);
  return assetPath(root, `assets/metadata/${id}.json`, 'assets/metadata');
};

export async function readRecipe(
  root: string,
  id: string,
): Promise<{ recipe: AssetRecipe; text: string }> {
  const text = await readFile(await recipePath(root, id), 'utf8');
  return { recipe: parseRecipe(JSON.parse(text), id), text };
}
