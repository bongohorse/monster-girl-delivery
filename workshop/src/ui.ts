import type { Source } from './catalog';

export const repository = 'https://github.com/bongohorse/monster-girl-delivery';

export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.textContent = text;
  result.className = className;
  return result;
}

export function link(text: string, href: string, className = ''): HTMLAnchorElement {
  const result = node('a', text, className);
  result.href = href;
  return result;
}

export function sourceHref(source: Source): string {
  const encoded = source.path.split('/').map(encodeURIComponent).join('/');
  return `${repository}/blob/${source.revision}/${encoded}`;
}

export function sourceLink(source: Source): HTMLAnchorElement {
  const result = link(source.path, sourceHref(source));
  result.title = `${source.kind} · ${source.symbol ?? source.path} · ${source.revision}`;
  return result;
}

export const implementationLabels: Record<string, string> = {
  planned: 'geplant',
  partial: 'teilweise umgesetzt',
  implemented: 'umgesetzt',
};

export const documentationLabels: Record<string, string> = {
  checked: 'Dokumentation geprüft',
  'source-conflict': 'Quellenkonflikt',
  unchecked: 'Dokumentation ungeprüft',
};
