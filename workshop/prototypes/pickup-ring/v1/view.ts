import type { Catalog } from '../../../src/catalog';
import { dataTransfer, localNotes } from '../../../src/ideaViews';
import { workshopDrafts } from '../../../src/localSession';
import { node } from '../../../src/ui';
import { effectAt, pickupRing, validValues } from './model';
import './styles.css';

export function mountPilot(data: Catalog, refresh: () => void) {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const invalidVariant =
    params.has('variant') && !pickupRing.variants.some((v) => v.id === params.get('variant'));
  let variant = pickupRing.variants.some((v) => v.id === params.get('variant'))
    ? (params.get('variant') as 'ring' | 'disc')
    : 'ring';
  const presets = workshopDrafts
    .snapshot()
    .presets.filter((p) => p.versionId === pickupRing.versionId && p.variantId === variant);
  const preset = presets[presets.length - 1];
  let values =
    preset && validValues(preset.values) ? { ...preset.values } : { ...pickupRing.defaults };
  const candidate = Object.fromEntries(
    pickupRing.controls.map((c) => [
      c.id,
      params.has(c.id) ? Number(params.get(c.id)) : values[c.id],
    ]),
  );
  const hasValues = pickupRing.controls.some((c) => params.has(c.id));
  const validLink =
    validValues(candidate) &&
    !pickupRing.controls.some((c) => params.has(c.id) && !params.get(c.id)?.trim());
  if (hasValues && validLink) values = candidate;
  let seconds = 0,
    previous: number | null = null,
    frame: number | null = null;
  const element = node('section', '', 'pickup-study');
  element.append(
    node('h2', 'Pickup-Ring · unabhängige Effektstudie'),
    node(
      'p',
      'Wachsender, ausblendender Ring oder Scheibe nach einem vorgeschlagenen Pickup. Keine Spielintegration.',
    ),
  );
  if (invalidVariant) {
    const notice = node(
      'p',
      'Unbekanntes Effektkonzept; Ring mit eigenen Werten/Defaults gewählt.',
    );
    notice.setAttribute('role', 'alert');
    element.append(notice);
  }
  if (hasValues && !validLink)
    element.append(node('p', 'Ungültige Linkwerte; eigenes Preset oder Defaults gelten.'));
  const label = node('label', 'Effektkonzept'),
    select = node('select');
  select.name = 'variant';
  for (const v of pickupRing.variants) {
    const o = node('option', v.name);
    o.value = v.id;
    select.append(o);
  }
  select.value = variant;
  label.append(select);
  element.append(label);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 300 160');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Schematischer Pickup-Effekt');
  svg.classList.add('pickup-scene');
  const circle = document.createElementNS(svg.namespaceURI, 'circle');
  circle.setAttribute('cx', '150');
  circle.setAttribute('cy', '80');
  circle.setAttribute('stroke', '#9fe7d9');
  circle.setAttribute('stroke-width', '3');
  svg.append(circle);
  element.append(svg);
  const play = node('button', 'Play');
  play.type = 'button';
  const restart = node('button', 'Restart');
  restart.type = 'button';
  element.append(play, restart);
  const timeLabel = node('label', 'Effektzeit'),
    scrub = node('input');
  scrub.type = 'range';
  scrub.name = 'scrubber';
  scrub.min = '0';
  scrub.max = '2';
  scrub.step = '0.01';
  timeLabel.append(scrub);
  element.append(timeLabel);
  for (const c of pickupRing.controls) {
    const label = node('label', `${c.label} (${c.unit})`),
      input = node('input'),
      out = node('output');
    input.type = 'range';
    input.name = c.id;
    input.min = String(c.min);
    input.max = String(c.max);
    input.step = String(c.step);
    input.value = String(values[c.id]);
    out.value = String(values[c.id]);
    label.append(input, out);
    input.addEventListener('input', () => {
      values = { ...values, [c.id]: Number(input.value) };
      out.value = input.value;
      draw();
    });
    element.append(label);
  }
  const config = () => ({
    ideaId: pickupRing.ideaId,
    versionId: pickupRing.versionId,
    variantId: variant,
    values: { ...values },
  });
  element.append(localNotes(pickupRing.ideaId, config), dataTransfer(data, refresh, config));
  function draw() {
    const e = effectAt(seconds, values);
    circle.setAttribute('r', String(e.radius));
    circle.setAttribute('opacity', String(e.opacity));
    circle.setAttribute('fill', variant === 'disc' ? '#9fe7d9' : 'none');
    svg.dataset.values = JSON.stringify(values);
    svg.dataset.variant = variant;
    svg.dataset.seconds = String(seconds);
    scrub.value = String(seconds);
  }
  function pause() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
    play.textContent = 'Play';
  }
  function tick(now: number) {
    frame = null;
    const delta = previous === null ? 0 : (now - previous) / 1000;
    previous = now;
    if (delta <= 0.25) seconds = Math.min(2, seconds + delta);
    draw();
    if (seconds < 2) frame = requestAnimationFrame(tick);
    else pause();
  }
  play.addEventListener('click', () => {
    if (play.textContent === 'Pause') pause();
    else {
      if (seconds >= 2) seconds = 0;
      play.textContent = 'Pause';
      previous = null;
      frame = requestAnimationFrame(tick);
    }
  });
  restart.addEventListener('click', () => {
    seconds = 0;
    previous = null;
    draw();
  });
  scrub.addEventListener('input', () => {
    const target = Number(scrub.value);
    pause();
    seconds = target;
    draw();
  });
  select.addEventListener('change', () => {
    variant = select.value as 'ring' | 'disc';
    draw();
  });
  const hide = () => {
    if (document.hidden) pause();
  };
  document.addEventListener('visibilitychange', hide);
  window.addEventListener('pagehide', pause);
  draw();
  return {
    element,
    dispose() {
      pause();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', pause);
    },
  };
}
