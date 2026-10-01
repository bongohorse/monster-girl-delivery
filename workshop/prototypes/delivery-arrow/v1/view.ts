import type { Catalog } from '../../../src/catalog';
import { dataTransfer, localNotes } from '../../../src/ideaViews';
import { localDrafts } from '../../../src/localSession';
import { node } from '../../../src/ui';
import {
  advancePlayhead,
  isVariant,
  type PilotValues,
  pilotV1,
  sceneAt,
  timeline,
  type VariantId,
  validPilotValues,
} from './model';
import './styles.css';

export function mountPilot(data: Catalog, refresh: () => void) {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  let variant: VariantId = isVariant(params.get('variant'))
    ? (params.get('variant') as VariantId)
    : 'height-arrow';
  const presets = localDrafts
    .snapshot()
    .presets.filter((p) => p.versionId === pilotV1.versionId && p.variantId === variant);
  const preset = params.has('preset')
    ? presets.find((p) => p.id === params.get('preset'))
    : presets[presets.length - 1];
  let values: PilotValues = { ...(preset?.values ?? pilotV1.defaults) };
  let notice = preset ? `Lokales Preset: ${preset.name}` : 'v1-Defaults';
  if (params.has('variant') && !isVariant(params.get('variant')))
    notice = 'Unbekanntes Konzept; Höhenpfeil mit Defaults gewählt.';
  if (params.has('preset') && !preset)
    notice = 'Preset fehlt oder gehört zu anderer Version/Variante; v1-Defaults gewählt.';
  if (pilotV1.controls.some((c) => params.has(c.id))) {
    const candidate = Object.fromEntries(
      pilotV1.controls.map((c) => [
        c.id,
        params.has(c.id) ? Number(params.get(c.id)) : values[c.id],
      ]),
    );
    if (
      validPilotValues(candidate) &&
      !pilotV1.controls.some((c) => params.has(c.id) && !params.get(c.id)?.trim())
    ) {
      values = candidate;
      notice = 'Validierte Linkparameter';
    } else
      notice =
        'Ungültige Linkwerte nicht übernommen; passendes lokales Preset oder v1-Defaults gelten.';
  }
  let seconds = 0;
  let playing = false;
  let speed: 0.5 | 1 | 2 = 1;
  let loop = false;
  let frame: number | null = null;
  let previous: number | null = null;
  let disposed = false;
  const element = node('section', '', 'motion-pilot');
  element.append(
    node('h2', 'Lieferpfeil v1 · Motion-Studie'),
    node(
      'p',
      'Schematische Runner-Szene mit inszenierter Aufnahme und Übergabe. Vorgeschlagene Zeiten/Geometrie; keine Kollisions- oder Spielintegration. Variantenwechsel nutzt dieselbe Zeit.',
    ),
  );
  const status = node('p', notice);
  status.setAttribute('role', 'status');
  element.append(status);
  const selectLabel = node('label', 'Pfeilkonzept');
  const variantSelect = node('select');
  variantSelect.name = 'variant';
  for (const item of pilotV1.variants) {
    const option = node('option', item.name);
    option.value = item.id;
    variantSelect.append(option);
  }
  variantSelect.value = variant;
  selectLabel.append(variantSelect);
  element.append(selectLabel);
  const concept = node('p');
  element.append(concept);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 800 260');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Schematische Kurierin, Paket, Empfänger und Lieferpfeil');
  svg.classList.add('pilot-scene');
  const shape = (
    tag: 'rect' | 'circle' | 'path' | 'text' | 'g',
    attributes: Record<string, string>,
    parent: SVGElement = svg,
    text = '',
  ) => {
    const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) item.setAttribute(key, value);
    item.textContent = text;
    parent.append(item);
    return item;
  };
  shape('rect', { width: '800', height: '260', fill: '#16202c' });
  shape('rect', { x: '0', y: '215', width: '800', height: '45', fill: '#263b45' });
  const ground = Array.from({ length: 10 }, (_, i) =>
    shape('rect', { x: String(i * 100), y: '235', width: '35', height: '4', fill: '#658d84' }),
  );
  const courier = shape('g', { transform: 'translate(160 170)' });
  shape('circle', { cx: '0', cy: '-18', r: '12', fill: '#9fe7d9' }, courier);
  shape('path', { d: 'M -13 0 L 10 0 L 20 30 L -18 30 Z', fill: '#9fe7d9' }, courier);
  shape(
    'text',
    { x: '-50', y: '-45', fill: '#eaf0fa', 'font-size': '13' },
    courier,
    'Kurierin · Schema',
  );
  const parcel = shape('rect', {
    y: '180',
    width: '20',
    height: '18',
    fill: '#ffd08b',
    stroke: '#765a27',
  });
  const recipient = shape('g', {});
  shape(
    'rect',
    { x: '-25', y: '85', width: '50', height: '100', fill: '#ad9bff', opacity: '0.2' },
    recipient,
  );
  shape('circle', { cx: '0', cy: '105', r: '11', fill: '#ad9bff' }, recipient);
  shape('rect', { x: '-11', y: '118', width: '22', height: '40', fill: '#ad9bff' }, recipient);
  shape('text', { x: '-35', y: '72', fill: '#eaf0fa', 'font-size': '13' }, recipient, 'Empfänger');
  const cue = shape('g', {});
  const band = shape(
    'rect',
    { x: '-40', y: '-32', width: '80', height: '64', fill: '#ffaf78', opacity: '0.3' },
    cue,
  );
  const arrow = shape(
    'path',
    {
      d: 'M -0.5 -0.2 L 0.1 -0.2 L 0.1 -0.5 L 0.5 0 L 0.1 0.5 L 0.1 0.2 L -0.5 0.2 Z',
      fill: '#ffd08b',
    },
    cue,
  );
  const countdown = shape('text', { x: '-35', y: '48', fill: '#eaf0fa', 'font-size': '14' }, cue);
  const phaseText = shape('text', { x: '20', y: '25', fill: '#eaf0fa', 'font-size': '15' });
  element.append(svg);
  const motion = node('div', '', 'motion-toolbar');
  const play = node('button', 'Play');
  play.type = 'button';
  const restart = node('button', 'Restart');
  restart.type = 'button';
  const reset = node('button', 'Reset · v1-Defaults');
  reset.type = 'button';
  const rateLabel = node('label', 'Geschwindigkeit');
  const rate = node('select');
  rate.name = 'playback-speed';
  for (const [value, name] of [
    ['0.5', '0,5×'],
    ['1', '1×'],
    ['2', '2×'],
  ]) {
    const option = node('option', name);
    option.value = value;
    rate.append(option);
  }
  rate.value = '1';
  rateLabel.append(rate);
  const loopLabel = node('label', 'Loop');
  const loopInput = node('input');
  loopInput.type = 'checkbox';
  loopInput.name = 'loop';
  loopLabel.prepend(loopInput);
  motion.append(play, restart, reset, rateLabel, loopLabel);
  element.append(motion);
  const time = node('output');
  time.setAttribute('aria-live', 'off');
  const scrubLabel = node('label', 'Zeit / Scrubber');
  const scrub = node('input');
  scrub.type = 'range';
  scrub.name = 'scrubber';
  scrub.min = '0';
  scrub.max = String(pilotV1.duration);
  scrub.step = '0.01';
  scrubLabel.append(scrub, time);
  element.append(scrubLabel);
  const phases = node('ol', '', 'pilot-timeline');
  phases.setAttribute('aria-label', 'Timeline');
  element.append(node('h3', 'Timeline · inszenierte Phasen'), phases);
  const controls = node('div', '', 'pilot-parameters');
  const inputs = new Map<
    keyof PilotValues,
    { input: HTMLInputElement; output: HTMLOutputElement }
  >();
  for (const control of pilotV1.controls) {
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
      status.textContent = 'Ungespeicherte lokale Reglerwerte';
      syncParameters();
      draw();
    });
  }
  element.append(controls);
  function updateTimeline() {
    phases.replaceChildren();
    for (const marker of timeline(values)) {
      const item = node('li');
      const jump = node('button', `${marker.name} · ${marker.seconds.toFixed(1)} s`);
      jump.type = 'button';
      jump.addEventListener('click', () => {
        pause();
        seconds = marker.seconds;
        draw();
      });
      item.append(jump);
      phases.append(item);
    }
  }
  function syncParameters() {
    for (const c of pilotV1.controls) {
      const pair = inputs.get(c.id);
      if (pair) {
        pair.input.value = String(values[c.id]);
        pair.output.value = `${values[c.id]} ${c.unit}`;
      }
    }
    updateTimeline();
  }
  function draw() {
    const scene = sceneAt(seconds, values, variant);
    svg.dataset.seconds = String(seconds);
    svg.dataset.variant = variant;
    svg.dataset.values = JSON.stringify(values);
    svg.dataset.phase = scene.phase;
    concept.textContent = pilotV1.variants.find((v) => v.id === variant)?.description ?? '';
    recipient.setAttribute('transform', `translate(${scene.recipientX} 0)`);
    ground.forEach((mark, i) => {
      mark.setAttribute('x', String(i * 100 - scene.groundOffset));
    });
    parcel.setAttribute('x', String(scene.carrying ? 178 : scene.parcelX));
    parcel.setAttribute('y', scene.carrying ? '175' : '180');
    parcel.setAttribute('visibility', seconds < pilotV1.handoff ? 'visible' : 'hidden');
    cue.setAttribute('visibility', scene.cueVisible ? 'visible' : 'hidden');
    cue.setAttribute('transform', `translate(${scene.cueX} ${scene.cueY})`);
    cue.setAttribute('opacity', String(scene.cueOpacity));
    arrow.setAttribute('transform', `rotate(${scene.cueRotation}) scale(${values.size})`);
    band.setAttribute('visibility', variant === 'edge-beacon' ? 'visible' : 'hidden');
    band.setAttribute('height', String(values.size + 28));
    band.setAttribute('y', String(-(values.size + 28) / 2));
    countdown.textContent = variant === 'edge-beacon' ? `${scene.remaining.toFixed(1)} s` : '';
    phaseText.textContent = {
      approach: 'Anflug zum Paket',
      carrying: 'Paket getragen',
      warning: 'Vorwarnung',
      delivered: 'Übergabe abgeschlossen',
    }[scene.phase];
    scrub.value = String(seconds);
    time.value = `${seconds.toFixed(2)} / ${pilotV1.duration.toFixed(2)} s`;
    play.textContent = playing ? 'Pause' : 'Play';
    svg.dataset.playing = String(playing);
  }
  function pause() {
    playing = false;
    previous = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    draw();
  }
  function tick(timestamp: number) {
    frame = null;
    if (!playing || disposed) return;
    if (previous !== null) {
      const elapsed = (timestamp - previous) / 1000;
      if (elapsed <= 0.25) {
        const next = advancePlayhead(seconds, elapsed, speed, loop);
        seconds = next.seconds;
        if (next.ended) playing = false;
      }
    }
    previous = timestamp;
    draw();
    if (playing) frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (playing) pause();
    else {
      if (seconds >= pilotV1.duration) seconds = 0;
      playing = true;
      previous = null;
      draw();
      frame = requestAnimationFrame(tick);
    }
  });
  restart.addEventListener('click', () => {
    seconds = 0;
    previous = null;
    draw();
  });
  reset.addEventListener('click', () => {
    pause();
    values = { ...pilotV1.defaults };
    seconds = 0;
    speed = 1;
    rate.value = '1';
    loop = false;
    loopInput.checked = false;
    status.textContent = 'v1-Defaults und Ablauf zurückgesetzt; Konzept bleibt gewählt.';
    syncParameters();
    draw();
  });
  scrub.addEventListener('input', () => {
    const target = Number(scrub.value);
    pause();
    seconds = target;
    draw();
  });
  rate.addEventListener('change', () => {
    speed = Number(rate.value) as 0.5 | 1 | 2;
    previous = null;
  });
  loopInput.addEventListener('change', () => {
    loop = loopInput.checked;
  });
  const presetSelectLabel = node('label', 'Lokales v1-Preset');
  const presetSelect = node('select');
  presetSelect.name = 'pilot-preset';
  presetSelectLabel.append(presetSelect);
  const refreshPresets = (selected = '') => {
    presetSelect.replaceChildren();
    const empty = node('option', 'Preset wählen');
    empty.value = '';
    presetSelect.append(empty);
    for (const p of localDrafts
      .snapshot()
      .presets.filter((p) => p.versionId === pilotV1.versionId && p.variantId === variant)) {
      const option = node('option', p.name);
      option.value = p.id;
      presetSelect.append(option);
    }
    presetSelect.value = selected;
  };
  const remember = (presetId?: string) => {
    const url = new URL(window.location.href);
    const [path, query] = url.hash.split('?');
    const linkParams = new URLSearchParams(query ?? '');
    linkParams.set('variant', variant);
    for (const c of pilotV1.controls) linkParams.delete(c.id);
    if (presetId) linkParams.set('preset', presetId);
    else linkParams.delete('preset');
    url.hash = `${path || '#/version/delivery-arrow-v1'}?${linkParams.toString()}`;
    window.history.replaceState(null, '', url);
  };
  variantSelect.addEventListener('change', () => {
    if (!isVariant(variantSelect.value)) return;
    variant = variantSelect.value;
    remember();
    refreshPresets();
    draw();
  });
  const presetForm = node('form', '', 'pilot-preset-form');
  const nameLabel = node('label', 'v1-Presetname');
  const name = node('input');
  name.name = 'pilot-preset-name';
  name.required = true;
  name.maxLength = 100;
  nameLabel.append(name);
  const save = node('button', 'v1-Preset lokal speichern');
  save.type = 'submit';
  presetForm.append(nameLabel, save);
  presetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = name.value.trim();
    if (!title) return;
    const bundle = localDrafts.snapshot();
    const old = bundle.presets.find(
      (p) => p.versionId === pilotV1.versionId && p.variantId === variant && p.name === title,
    );
    const record = {
      id: old?.id ?? crypto.randomUUID(),
      name: title,
      ideaId: pilotV1.ideaId,
      versionId: pilotV1.versionId,
      variantId: variant,
      values: { ...values },
      date: new Date().toISOString(),
    };
    bundle.presets = [...bundle.presets.filter((p) => p.id !== record.id), record];
    const result = localDrafts.update(bundle);
    status.textContent = result.ok ? localDrafts.message : result.errors.join(' ');
    if (result.ok) {
      refreshPresets(record.id);
      remember(record.id);
    }
  });
  const apply = node('button', 'v1-Preset anwenden');
  apply.type = 'button';
  apply.addEventListener('click', () => {
    const record = localDrafts
      .snapshot()
      .presets.find(
        (p) =>
          p.id === presetSelect.value &&
          p.versionId === pilotV1.versionId &&
          p.variantId === variant,
      );
    if (!record) {
      status.textContent = 'Bitte ein passendes v1-Preset wählen.';
      return;
    }
    values = { ...record.values };
    remember(record.id);
    status.textContent = `Lokales v1-Preset: ${record.name}`;
    syncParameters();
    draw();
  });
  element.append(
    presetForm,
    presetSelectLabel,
    apply,
    localNotes(pilotV1.ideaId, configuration),
    dataTransfer(data, refresh, configuration),
  );
  function configuration() {
    return {
      ideaId: pilotV1.ideaId,
      versionId: pilotV1.versionId,
      variantId: variant,
      values: { ...values },
    };
  }
  const hide = () => {
    pause();
    status.textContent = 'Lifecycle-Pause; Play startet ohne nachgeholte Hintergrundzeit.';
  };
  const visibility = () => {
    if (document.hidden) hide();
    previous = null;
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', hide);
  syncParameters();
  refreshPresets(preset?.id);
  draw();
  return {
    element,
    dispose() {
      disposed = true;
      pause();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
    },
  };
}
