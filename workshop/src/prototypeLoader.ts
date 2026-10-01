import { historyStyles } from 'virtual:workshop-history';
import type { Catalog } from './catalog';
import type { LocalConfiguration } from './localData';
import { definitionFor } from './prototypes';

interface PrototypeModule {
  mountPilot(data: Catalog, refresh: () => void): { element: HTMLElement; dispose(): void };
}
const modules = import.meta.glob<PrototypeModule>('../prototypes/**/view.ts');
export async function mountPrototype(versionId: string, data: Catalog, refresh: () => void) {
  const definition = definitionFor(versionId);
  if (!definition?.entry) throw new Error(`Kein ausführbarer Prototyp: ${versionId}`);
  const load = modules[`../${definition.entry.replace(/index\.html$/, 'view.ts')}`];
  if (!load) throw new Error(`Prototypmodul fehlt: ${versionId}`);
  const module = await load();
  const mounted = module.mountPilot(data, refresh);
  const current = (): LocalConfiguration => ({
    ideaId: definition.ideaId,
    versionId,
    variantId: mounted.element.querySelector<HTMLSelectElement>('[name="variant"]')?.value ?? '',
    values: Object.fromEntries(
      definition.controls.map((c) => [
        c.id,
        Number(mounted.element.querySelector<HTMLInputElement>(`[name="${c.id}"]`)?.value),
      ]),
    ),
  });
  const host = document.createElement('section');
  host.className = 'prototype-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = historyStyles(versionId);
  const frame = document.createElement('div');
  frame.className = 'workshop-history-frame';
  frame.append(mounted.element);
  shadow.append(style, frame);
  return { element: host, dispose: mounted.dispose, configuration: current };
}
