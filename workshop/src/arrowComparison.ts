import {
  advancePlayhead,
  isVariant,
  type PilotValues,
  pilotV1,
  sceneAt as sceneV1,
  type VariantId,
  validPilotValues,
} from '../prototypes/delivery-arrow/v1/model';
import {
  sceneAt as sceneV2,
  validPilotValues as validV2,
} from '../prototypes/delivery-arrow/v2/model';
import { node } from './ui';
import './arrowComparison.css';

/** One clock and one renderer compare independent version-owned scene functions. */
export function mountComparison() {
  let values: PilotValues = { ...pilotV1.defaults };
  let variant: VariantId = 'height-arrow';
  let seconds = 0;
  let side: 'A' | 'B' = 'A';
  let playing = false;
  let speed: 0.5 | 1 | 2 = 1;
  let loop = false;
  let frame: number | null = null;
  let previous: number | null = null;
  let disposed = false;
  let notice = 'Gemeinsame v1-Defaults; lokale Versionspresets werden hier nicht übernommen.';
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  if (params.size) {
    const allowed = new Set(['variant', 'time', 'side', ...pilotV1.controls.map((c) => c.id)]);
    const candidate = Object.fromEntries(
      pilotV1.controls.map((c) => [
        c.id,
        params.has(c.id) ? Number(params.get(c.id)) : pilotV1.defaults[c.id],
      ]),
    );
    const candidateTime = params.has('time') ? Number(params.get('time')) : 0;
    const candidateVariant = params.get('variant') ?? 'height-arrow';
    const candidateSide = params.get('side') ?? 'A';
    const validKeys = [...params.keys()].every(
      (key) =>
        allowed.has(key) && params.getAll(key).length === 1 && Boolean(params.get(key)?.trim()),
    );
    if (
      validKeys &&
      validPilotValues(candidate) &&
      validV2(candidate) &&
      isVariant(candidateVariant) &&
      Number.isFinite(candidateTime) &&
      candidateTime >= 0 &&
      candidateTime <= pilotV1.duration &&
      (candidateSide === 'A' || candidateSide === 'B')
    ) {
      values = candidate;
      seconds = candidateTime;
      variant = candidateVariant;
      side = candidateSide;
      notice = 'Validierte Vergleichskonfiguration aus dem Link.';
    } else notice = 'Ungültiger Vergleichslink; gemeinsame v1-Defaults bei Zeit 0 gelten.';
  }
  const element = node('section', '', 'arrow-comparison');
  element.append(
    node('h2', 'A/B · Lieferpfeil v1 und v2'),
    node(
      'p',
      'Schneller Wechsel mit derselben Zeit, Szene und denselben Reglerwerten. A zeigt v1, B zeigt v2. Die eigenen Versionsdefaults unterscheiden sich; hier gilt für beide die gemeinsame v1-Basis. Vorgeschlagene Studie, keine Spielintegration.',
    ),
  );
  const status = node('p', notice);
  status.setAttribute('role', 'status');
  const selected = node('p', '', 'comparison-version');
  const toolbar = node('div', '', 'comparison-toolbar');
  const a = node('button', 'A · v1');
  const b = node('button', 'B · v2');
  for (const button of [a, b]) button.type = 'button';
  const variantLabel = node('label', 'Gemeinsames Konzept');
  const variants = node('select');
  variants.name = 'comparison-variant';
  for (const item of pilotV1.variants) {
    const option = node('option', item.name);
    option.value = item.id;
    variants.append(option);
  }
  variants.value = variant;
  variantLabel.append(variants);
  toolbar.append(a, b, variantLabel);
  element.append(status, selected, toolbar);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 800 260');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Gemeinsame schematische Vergleichsszene');
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
  shape('rect', { y: '215', width: '800', height: '45', fill: '#263b45' });
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
  const phase = shape('text', { x: '20', y: '25', fill: '#eaf0fa', 'font-size': '15' });
  element.append(svg);
  const motion = node('div', '', 'comparison-toolbar');
  const play = node('button', 'Play');
  const restart = node('button', 'Restart');
  const reset = node('button', 'Reset · gemeinsame v1-Basis');
  for (const button of [play, restart, reset]) button.type = 'button';
  const rateLabel = node('label', 'Geschwindigkeit');
  const rate = node('select');
  rate.name = 'comparison-speed';
  for (const [value, label] of [
    ['0.5', '0,5×'],
    ['1', '1×'],
    ['2', '2×'],
  ]) {
    const option = node('option', label);
    option.value = value;
    rate.append(option);
  }
  rate.value = '1';
  rateLabel.append(rate);
  const loopLabel = node('label', 'Loop');
  const loopInput = node('input');
  loopInput.type = 'checkbox';
  loopInput.name = 'comparison-loop';
  loopLabel.prepend(loopInput);
  motion.append(play, restart, reset, rateLabel, loopLabel);
  const scrubLabel = node('label', 'Gemeinsame Zeit');
  const scrub = node('input');
  scrub.type = 'range';
  scrub.name = 'comparison-time';
  scrub.min = '0';
  scrub.max = String(pilotV1.duration);
  scrub.step = '0.01';
  const time = node('output');
  scrubLabel.append(scrub, time);
  const controls = node('div', '', 'comparison-controls');
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
      const candidate = { ...values, [control.id]: Number(input.value) };
      if (validPilotValues(candidate) && validV2(candidate)) {
        values = candidate;
        draw();
      }
    });
  }
  const share = node('a', 'Vergleichslink öffnen', 'comparison-share');
  const remember = node('button', 'Vergleichslink übernehmen');
  remember.type = 'button';
  element.append(motion, scrubLabel, controls, remember, share);
  function shareHash() {
    const query = new URLSearchParams({ variant, side, time: String(seconds) });
    for (const c of pilotV1.controls) query.set(c.id, String(values[c.id]));
    return `#/compare/delivery-arrow-study?${query}`;
  }
  function draw() {
    const state =
      side === 'A' ? sceneV1(seconds, values, variant) : sceneV2(seconds, values, variant);
    selected.textContent = `${side} · ${side === 'A' ? 'delivery-arrow-v1' : 'delivery-arrow-v2'} · identische Vergleichswerte`;
    a.setAttribute('aria-pressed', String(side === 'A'));
    b.setAttribute('aria-pressed', String(side === 'B'));
    svg.dataset.seconds = String(seconds);
    svg.dataset.version = side === 'A' ? 'delivery-arrow-v1' : 'delivery-arrow-v2';
    svg.dataset.variant = variant;
    svg.dataset.values = JSON.stringify(values);
    svg.dataset.phase = state.phase;
    recipient.setAttribute('transform', `translate(${state.recipientX} 0)`);
    parcel.setAttribute('x', String(state.carrying ? 178 : state.parcelX));
    parcel.setAttribute('y', state.carrying ? '175' : '180');
    parcel.setAttribute('visibility', state.phase === 'delivered' ? 'hidden' : 'visible');
    ground.forEach((item, i) => {
      item.setAttribute('x', String(i * 100 - state.groundOffset));
    });
    cue.setAttribute('transform', `translate(${state.cueX} ${state.cueY})`);
    cue.setAttribute('visibility', state.cueVisible ? 'visible' : 'hidden');
    cue.setAttribute('opacity', String(state.cueOpacity));
    arrow.setAttribute('transform', `rotate(${state.cueRotation}) scale(${values.size})`);
    band.setAttribute('visibility', variant === 'edge-beacon' ? 'visible' : 'hidden');
    band.setAttribute('height', String(values.size + 28));
    band.setAttribute('y', String(-(values.size + 28) / 2));
    countdown.textContent = variant === 'edge-beacon' ? `${state.remaining.toFixed(1)} s` : '';
    phase.textContent = `${state.phase} · ${seconds.toFixed(2)} s`;
    scrub.value = String(seconds);
    time.value = `${seconds.toFixed(2)} / ${pilotV1.duration} s`;
    for (const c of pilotV1.controls) {
      const pair = inputs.get(c.id);
      if (pair) {
        pair.input.value = String(values[c.id]);
        pair.output.value = `${values[c.id]} ${c.unit}`;
      }
    }
    share.href = shareHash();
  }
  function pause() {
    playing = false;
    previous = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    play.textContent = 'Play';
  }
  function tick(now: number) {
    if (disposed || !playing) return;
    const elapsed = previous === null ? 0 : Math.max(0, (now - previous) / 1000);
    previous = now;
    // A stalled frame is a lifecycle gap, not simulated playback time.
    const next = advancePlayhead(seconds, elapsed <= 0.25 ? elapsed : 0, speed, loop);
    seconds = next.seconds;
    draw();
    if (next.ended) pause();
    else frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (playing) {
      pause();
      return;
    }
    if (seconds >= pilotV1.duration) seconds = 0;
    playing = true;
    previous = null;
    play.textContent = 'Pause';
    frame = requestAnimationFrame(tick);
  });
  a.addEventListener('click', () => {
    side = 'A';
    draw();
  });
  b.addEventListener('click', () => {
    side = 'B';
    draw();
  });
  variants.addEventListener('change', () => {
    if (isVariant(variants.value)) {
      variant = variants.value;
      draw();
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
    draw();
  });
  scrub.addEventListener('input', () => {
    pause();
    const value = Number(scrub.value);
    if (Number.isFinite(value) && value >= 0 && value <= pilotV1.duration) {
      seconds = value;
      draw();
    }
  });
  rate.addEventListener('change', () => {
    const value = Number(rate.value);
    if (value === 0.5 || value === 1 || value === 2) speed = value;
    previous = null;
  });
  loopInput.addEventListener('change', () => {
    loop = loopInput.checked;
  });
  remember.addEventListener('click', () => {
    history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${shareHash()}`,
    );
    status.textContent =
      'Vergleichskonfiguration im Link übernommen; keine lokale Auswahlentscheidung.';
  });
  const hide = () => {
    pause();
    status.textContent = 'Lifecycle-Pause ohne nachgeholte Hintergrundzeit.';
  };
  const visibility = () => {
    if (document.hidden) hide();
    previous = null;
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', hide);
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
