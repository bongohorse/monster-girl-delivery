import sharp from 'sharp';
import type { AssetRecipe } from './AssetRecipe';

export const IMAGE_LIMITS = { bytes: 64 * 1024 * 1024, pixels: 32 * 1024 * 1024, seconds: 15 };
export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface ImageMetrics {
  width: number;
  height: number;
  bytes: number;
  rgba8Estimate: number;
  visibleBounds: Bounds;
  alpha: { transparent: number; translucent: number; opaque: number };
}
export interface ImageResult {
  bytes: Buffer;
  extension: 'png' | 'jpg' | 'webp';
  source: ImageMetrics;
  output: ImageMetrics;
  content: Bounds;
  sourceCrop: Bounds;
  pivot: { x: number; y: number };
  sourcePreview: Buffer;
}

function measure(
  data: Buffer,
  width: number,
  height: number,
  bytes: number,
  threshold = 0,
): ImageMetrics {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  const alpha = { transparent: 0, translucent: 0, opaque: 0 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a === 0) alpha.transparent++;
      else if (a === 255) alpha.opaque++;
      else alpha.translucent++;
      if (a > threshold) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return {
    width,
    height,
    bytes,
    rgba8Estimate: width * height * 4,
    alpha,
    visibleBounds:
      right < 0
        ? { left: 0, top: 0, width: 0, height: 0 }
        : { left, top, width: right - left + 1, height: bottom - top + 1 },
  };
}

export async function inspectImage(bytes: Buffer): Promise<'png' | 'jpg' | 'webp'> {
  if (!bytes.length || bytes.length > IMAGE_LIMITS.bytes)
    throw new Error('Image must be nonempty and at most 64 MiB.');
  const metadata = await sharp(bytes, {
    limitInputPixels: IMAGE_LIMITS.pixels,
    failOn: 'error',
  }).metadata();
  if ((metadata.pages ?? 1) !== 1)
    throw new Error('Only static single-frame images are supported.');
  if (!['png', 'jpeg', 'webp'].includes(metadata.format ?? ''))
    throw new Error('Only PNG, JPEG and WebP images are supported.');
  return metadata.format === 'jpeg' ? 'jpg' : (metadata.format as 'png' | 'webp');
}

export async function processImage(bytes: Buffer, recipe: AssetRecipe): Promise<ImageResult> {
  const extension = await inspectImage(bytes);
  const decoded = await sharp(bytes, { limitInputPixels: IMAGE_LIMITS.pixels, failOn: 'error' })
    .timeout({ seconds: IMAGE_LIMITS.seconds })
    .autoOrient()
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = decoded.info;
  const source = measure(decoded.data, width, height, bytes.length);
  if (!source.visibleBounds.width) throw new Error('Image has no visible subject.');
  const raw = { width, height, channels: 4 as const };
  const sourcePreview = await sharp(decoded.data, { raw })
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  let content: Bounds = { left: 0, top: 0, width, height };
  let sourceCrop: Bounds = { left: 0, top: 0, width, height };
  let pivot = { x: recipe.pivot.x * width, y: recipe.pivot.y * height };
  let outputBytes = bytes;
  let outputExtension = extension;
  if (recipe.profile === 'pass-through') {
    const metadata = await sharp(bytes).metadata();
    if (
      (metadata.orientation ?? 1) !== 1 ||
      recipe.canvas.width !== width ||
      recipe.canvas.height !== height
    ) {
      throw new Error(
        'Pass-through requires native dimensions and orientation; use static-png to transform.',
      );
    }
  } else {
    const { canvas } = recipe;
    const crop =
      canvas.trimAlpha === null
        ? { left: 0, top: 0, width, height }
        : measure(decoded.data, width, height, bytes.length, canvas.trimAlpha).visibleBounds;
    sourceCrop = crop;
    if (!crop.width) throw new Error('Trim threshold removes the entire subject.');
    const scale = Math.min(
      1,
      (canvas.width - canvas.padding * 2) / crop.width,
      (canvas.height - canvas.padding * 2) / crop.height,
    );
    const w = Math.max(1, Math.round(crop.width * scale));
    const h = Math.max(1, Math.round(crop.height * scale));
    content = {
      left: Math.floor((canvas.width - w) / 2),
      top: Math.floor((canvas.height - h) / 2),
      width: w,
      height: h,
    };
    pivot = {
      x: ((recipe.pivot.x * width - crop.left) * w) / crop.width + content.left,
      y: ((recipe.pivot.y * height - crop.top) * h) / crop.height + content.top,
    };
    const artwork = await sharp(decoded.data, { raw })
      .timeout({ seconds: IMAGE_LIMITS.seconds })
      .extract(crop)
      .resize(w, h, { kernel: canvas.sampling })
      .png()
      .toBuffer();
    outputBytes = await sharp({
      create: { width: canvas.width, height: canvas.height, channels: 4, background: '#00000000' },
    })
      .composite([{ input: artwork, left: content.left, top: content.top }])
      .png({ compressionLevel: 9 })
      .toBuffer();
    outputExtension = 'png';
  }
  const output = await sharp(outputBytes, {
    limitInputPixels: IMAGE_LIMITS.pixels,
    failOn: 'error',
  })
    .autoOrient()
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    bytes: outputBytes,
    extension: outputExtension,
    source,
    output: measure(output.data, output.info.width, output.info.height, outputBytes.length),
    content,
    sourceCrop,
    pivot,
    sourcePreview,
  };
}

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** Self-contained comparison: no original paths, scripts, network requests or collision guesses. */
export function previewHtml(recipe: AssetRecipe, result: ImageResult, fingerprint: string): string {
  const mime = result.extension === 'jpg' ? 'jpeg' : result.extension;
  const runtime = `data:image/${mime};base64,${result.bytes.toString('base64')}`;
  const source = `data:image/png;base64,${result.sourcePreview.toString('base64')}`;
  const bounds = result.output.visibleBounds;
  const overlay = `<svg viewBox="0 0 ${result.output.width} ${result.output.height}" aria-label="Visible bounds and transformed source pivot"><rect x="${bounds.left}" y="${bounds.top}" width="${bounds.width}" height="${bounds.height}" fill="none" stroke="#00ffff" stroke-width="1"/><path d="M${result.pivot.x - 6} ${result.pivot.y}h12M${result.pivot.x} ${result.pivot.y - 6}v12" stroke="#ff33cc" stroke-width="1"/></svg>`;
  const figure = (label: string, style: string) =>
    `<figure><figcaption>${label}</figcaption><div class="sample ${style}"><div class="canvas"><img src="${runtime}" alt="Runtime candidate"/>${overlay}</div></div></figure>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(recipe.id)} — candidate</title>
<style>body{font:16px system-ui;margin:24px;background:#18202b;color:#f4f6f8}h1{font-size:24px}section{display:flex;flex-wrap:wrap;gap:20px}figure{margin:0}figcaption{padding:8px 0}img{display:block;max-width:100%;height:auto}.sample{padding:16px}.checker{background:repeating-conic-gradient(#bbb 0% 25%,#eee 0% 50%) 50%/16px 16px}.black{background:#000}.white{background:#fff}.canvas{position:relative;width:${Math.min(512, result.output.width)}px;max-width:70vw}.canvas img{width:100%;${recipe.canvas.sampling === 'nearest' ? 'image-rendering:pixelated;' : ''}}svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.target .canvas{width:${recipe.display.width}px;height:${recipe.display.height}px}.target img{width:100%;height:100%;object-fit:contain}.detail .canvas{width:${Math.min(1024, result.output.width * 2)}px}code{overflow-wrap:anywhere}dl{display:grid;grid-template-columns:max-content auto;gap:4px 16px}dd{margin:0}</style>
<h1>${escapeHtml(recipe.id)} — Candidate</h1><p>Prepared comparison, not runtime activation or art acceptance. Cyan: visible alpha bounds; pink: transformed source pivot.</p>
<dl><dt>Fingerprint</dt><dd><code>${fingerprint.slice(0, 12)}</code></dd><dt>Profile / state</dt><dd>${recipe.profile} / ${recipe.state}</dd><dt>Logical target / render factor</dt><dd>${recipe.display.width} × ${recipe.display.height}, factor ${recipe.display.renderScale}</dd><dt>Source</dt><dd>${result.source.width} × ${result.source.height}, ${result.source.bytes} bytes</dd><dt>Runtime</dt><dd>${result.output.width} × ${result.output.height}, ${result.output.bytes} bytes; RGBA8 estimate ${result.output.rgba8Estimate} bytes (not measured memory)</dd></dl>
<section><figure><figcaption>Original composition (overview ≤512 px)</figcaption><img src="${source}" alt="Original composition"/></figure>${figure('Runtime on checkerboard', 'checker')}${figure('Runtime on black', 'black')}${figure('Runtime on white', 'white')}</section>
<h2>Target size and detail</h2><p>Target uses logical CSS dimensions above; device render density is separate. The enlarged full canvas is a detail aid, not a sharpness/phone certification. Actual game presentation remains authoritative.</p><section>${figure('Logical target size', 'checker target')}${figure('Enlarged canvas', 'checker detail')}</section>
<p>Source provenance: ${escapeHtml(recipe.provenance)}. No rights approval is implied. Full identity and metrics: report.json.</p></html>`;
}
