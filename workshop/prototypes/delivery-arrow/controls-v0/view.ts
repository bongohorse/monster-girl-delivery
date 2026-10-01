import { node } from '../../../src/ui';
import type { WorkshopDraftStore } from '../../../src/WorkshopDraftStore';
import { type ArrowValues, arrowSample, controlPreview, validArrowValues } from './model';

export function resolvePreviewValues(
  hash: string,
  store: WorkshopDraftStore,
): { values: ArrowValues; origin: string; error?: string } {
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  const candidates = store
    .snapshot()
    .presets.filter(
      (p) =>
        p.ideaId === controlPreview.ideaId &&
        p.versionId === controlPreview.versionId &&
        p.variantId === controlPreview.variantId,
    );
  const preset = params.has('preset')
    ? candidates.find((p) => p.id === params.get('preset'))
    : candidates[candidates.length - 1];
  const fallback = {
    values:
      preset && validArrowValues(preset.values)
        ? { ...preset.values }
        : { ...controlPreview.defaults },
    origin: preset ? `Lokales Preset: ${preset.name}` : 'Dokumentierte Vorschau-Defaults',
  };
  const keys = controlPreview.controls.map((c) => c.id);
  if (!keys.some((key) => params.has(key)))
    return params.has('preset') && !preset
      ? {
          ...fallback,
          error: 'Das verlinkte Preset fehlt oder gehört nicht zu dieser Controls-Version.',
        }
      : fallback;
  const values = Object.fromEntries(
    keys.map((key) => [key, params.has(key) ? Number(params.get(key)) : fallback.values[key]]),
  );
  if (!validArrowValues(values) || keys.some((key) => params.has(key) && !params.get(key)?.trim()))
    return {
      ...fallback,
      error:
        'Ungültige Linkwerte wurden nicht übernommen. Es gelten das passende lokale Preset oder die Vorschau-Defaults.',
    };
  return { values, origin: 'Validierte Linkparameter' };
}

/** A static, schematically sampled control study. No render loop or gameplay integration. */
export function controlsPreview(
  store: WorkshopDraftStore,
  hash: string,
): { element: HTMLElement; values: () => ArrowValues } {
  const resolved = resolvePreviewValues(hash, store);
  let values = resolved.values;
  const element = node('section', '', 'control-preview');
  element.append(
    node('h2', 'Controls-/Preset-Vorschau'),
    node(
      'p',
      'Schematischer Vorläufer: ein Beispiel, feste Zeitproben, keine laufende Motion-Studie und keine Spielintegration. Drei Konzepte und Motion-Steuerung folgen in Aufgabe 7.',
    ),
    node('p', `${controlPreview.versionId} · Variante ${controlPreview.variantId}`),
  );
  const status = node('p', resolved.error ?? resolved.origin);
  status.setAttribute('role', resolved.error ? 'alert' : 'status');
  element.append(status);
  const image = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  image.setAttribute('viewBox', '0 0 480 170');
  image.setAttribute('role', 'img');
  image.setAttribute(
    'aria-label',
    'Schematische Pfeilvorschau bei 1,25 Sekunden und Blinkproben von 0 bis 6 Sekunden',
  );
  image.classList.add('arrow-preview');
  const draw = () => {
    image.replaceChildren();
    const shape = (
      tag: 'rect' | 'path' | 'text',
      attributes: Record<string, string>,
      text = '',
    ) => {
      const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attributes)) item.setAttribute(key, value);
      item.textContent = text;
      image.append(item);
      return item;
    };
    shape('rect', { x: '0', y: '0', width: '480', height: '170', fill: '#16202c' });
    const sample = arrowSample(values, 1.25);
    shape('rect', {
      x: String(sample.recipientX),
      y: '55',
      width: '24',
      height: '42',
      fill: '#b3a6ff',
    });
    if (sample.visible)
      shape('path', {
        d: 'M -0.5 -0.2 L 0.1 -0.2 L 0.1 -0.5 L 0.5 0 L 0.1 0.5 L 0.1 0.2 L -0.5 0.2 Z',
        fill: '#9fe7d9',
        opacity: String(sample.opacity),
        transform: `translate(45 75) scale(${sample.size})`,
      });
    shape(
      'text',
      { x: '12', y: '24', fill: '#eaf0fa', 'font-size': '13' },
      'Feste Szene bei 1,25 s · Ziel bewegt sich von rechts',
    );
    for (let i = 0; i <= 12; i++) {
      const frame = arrowSample(values, i * 0.5);
      shape('rect', {
        x: String(12 + i * 35),
        y: '118',
        width: '24',
        height: '14',
        fill: '#9fe7d9',
        opacity: frame.visible ? String(frame.opacity) : '0.08',
      });
    }
    shape(
      'text',
      { x: '12', y: '155', fill: '#aebacf', 'font-size': '13' },
      'Statische Blinkproben 0–6 s · ab Ende der Vorwarnung ausgeblendet',
    );
    image.dataset.values = JSON.stringify(values);
  };
  element.append(image);
  const controls = node('div', '', 'draft-form preview-controls');
  const inputs = new Map<
    keyof ArrowValues,
    { input: HTMLInputElement; output: HTMLOutputElement }
  >();
  const sync = () => {
    for (const c of controlPreview.controls) {
      const pair = inputs.get(c.id);
      if (pair) {
        pair.input.value = String(values[c.id]);
        pair.output.value = `${values[c.id]} ${c.unit}`;
      }
    }
    draw();
  };
  for (const control of controlPreview.controls) {
    const label = node('label', control.label);
    const input = node('input');
    input.type = 'range';
    input.name = control.id;
    input.min = String(control.min);
    input.max = String(control.max);
    input.step = String(control.step);
    const output = node('output');
    label.append(input, output);
    controls.append(label);
    inputs.set(control.id, { input, output });
    input.addEventListener('input', () => {
      values = { ...values, [control.id]: Number(input.value) };
      status.textContent =
        'Ungespeicherte lokale Reglerwerte · als Preset sichern, um sie bei Reload wiederherzustellen.';
      sync();
    });
  }
  element.append(controls);
  const reset = node('button', 'Defaults wiederherstellen');
  reset.type = 'button';
  reset.addEventListener('click', () => {
    values = { ...controlPreview.defaults };
    status.textContent =
      'Vorschau-Defaults wiederhergestellt; gespeicherte Presets bleiben erhalten.';
    sync();
  });
  element.append(reset);
  const form = node('form', '', 'draft-form');
  const nameLabel = node('label', 'Presetname');
  const name = node('input');
  name.name = 'preset-name';
  name.required = true;
  name.maxLength = 100;
  nameLabel.append(name);
  const save = node('button', 'Preset lokal speichern');
  save.type = 'submit';
  form.append(nameLabel, save);
  const rememberPreset = (id: string) => {
    const url = new URL(window.location.href);
    const [path, query] = url.hash.split('?');
    const params = new URLSearchParams(query ?? '');
    for (const control of controlPreview.controls) params.delete(control.id);
    params.set('preset', id);
    url.hash = `${path}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  };
  const presetLabel = node('label', 'Lokales Preset');
  const presets = node('select');
  presets.name = 'preset';
  presetLabel.append(presets);
  const refreshPresets = (selected = '') => {
    presets.replaceChildren();
    const empty = node('option', 'Preset wählen');
    empty.value = '';
    presets.append(empty);
    for (const p of store
      .snapshot()
      .presets.filter((p) => p.versionId === controlPreview.versionId)) {
      const option = node('option', p.name);
      option.value = p.id;
      presets.append(option);
    }
    presets.value = selected;
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = store.snapshot();
    const title = name.value.trim();
    if (!title) return;
    const existing = data.presets.find(
      (p) => p.versionId === controlPreview.versionId && p.name === title,
    );
    const preset = {
      id: existing?.id ?? crypto.randomUUID(),
      name: title,
      ideaId: controlPreview.ideaId,
      versionId: controlPreview.versionId,
      variantId: controlPreview.variantId,
      values: { ...values },
      date: new Date().toISOString(),
    };
    data.presets = [...data.presets.filter((p) => p.id !== preset.id), preset];
    const result = store.update(data);
    status.textContent = result.ok ? store.message : result.errors.join(' ');
    status.setAttribute('role', result.ok ? 'status' : 'alert');
    if (result.ok) {
      refreshPresets(preset.id);
      rememberPreset(preset.id);
    }
  });
  const apply = node('button', 'Preset anwenden');
  apply.type = 'button';
  apply.addEventListener('click', () => {
    const preset = store
      .snapshot()
      .presets.find((p) => p.id === presets.value && p.versionId === controlPreview.versionId);
    if (!preset || !validArrowValues(preset.values)) {
      status.textContent = 'Bitte ein passendes Preset wählen.';
      return;
    }
    values = { ...preset.values };
    rememberPreset(preset.id);
    status.textContent = `Lokales Preset angewendet: ${preset.name}`;
    sync();
  });
  element.append(
    form,
    presetLabel,
    apply,
    node(
      'p',
      'Größe beeinflusst den Pfeil, Blinkrate die statischen Helligkeitsproben, Vorwarnzeit die Sichtbarkeit und Scrollgeschwindigkeit die Zielposition. Vorgeschlagene Werte; kein Nachweis für Spielgefühl. Zuletzt gespeichertes passendes Preset gilt bei einem frischen Aufruf ohne Linkwerte.',
    ),
  );
  refreshPresets();
  sync();
  return { element, values: () => ({ ...values }) };
}
