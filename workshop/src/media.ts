import published from 'virtual:workshop-media';
import { node } from './ui';

export const media = published;

export function mediaImage(artifactId: string, alt: string, className = 'media'): HTMLElement {
  const artifact = media[artifactId];
  if (!artifact) return node('div', 'Medium nicht verfügbar', 'media media-empty');
  const image = node('img', '', className);
  image.src = artifact.url;
  image.alt = alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener(
    'error',
    () => image.replaceWith(node('div', 'Medium nicht verfügbar', 'media media-empty')),
    { once: true },
  );
  return image;
}
