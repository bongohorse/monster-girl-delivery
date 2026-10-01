import './versionViews.css';
import type { Catalog, PrototypeVersion } from './catalog';
import type { LocalConfiguration } from './localData';
import { localDrafts } from './localSession';
import { type ReviewDetails, validConfiguration } from './prototypeConfiguration';
import { link, node, repository } from './ui';

export function versionPicker(data: Catalog, ideaId: string, current?: string): HTMLElement {
  const label = node('label', 'Ausführbare Version', 'version-picker');
  const select = node('select');
  select.name = 'version';
  for (const version of data.versions.filter((v) => v.ideaId === ideaId)) {
    const option = node('option', version.name);
    option.value = version.id;
    select.append(option);
  }
  const versions = data.versions.filter((v) => v.ideaId === ideaId);
  select.value = current ?? versions[versions.length - 1]?.id ?? '';
  select.addEventListener('change', () => {
    window.location.hash = `/version/${select.value}`;
  });
  label.append(select, link('A/B auf gemeinsamer Zeit vergleichen', `#/compare/${ideaId}`));
  return label;
}
export function devLog(data: Catalog, ideaId: string): HTMLElement {
  const panel = node('section', '', 'dev-log');
  panel.append(node('h2', 'Dev Log · Iterationen'));
  for (const version of data.versions.filter((v) => v.ideaId === ideaId)) {
    const entry = node('article');
    entry.append(
      node('h3', `${version.date} · ${version.name}`),
      node('p', version.changeNote),
      link('Version ausführen', `#/version/${version.id}`),
      link('Standalone öffnen', version.entry),
    );
    const details = node('details');
    details.append(node('summary', 'Quellen und Versionsbindung'));
    for (const path of version.sourcePaths)
      details.append(
        version.sourceRevision
          ? link(path, `${repository}/blob/${version.sourceRevision}/${path}`)
          : node('p', `${path} · Arbeitsstand`),
      );
    entry.append(details);
    panel.append(entry);
  }
  return panel;
}
export function shareConfiguration(configuration: LocalConfiguration, origin: string): string {
  if (!validConfiguration({ ...configuration })) throw new Error('Ungültige Linkkonfiguration');
  const url = new URL(origin);
  const params = new URLSearchParams({ variant: configuration.variantId });
  for (const [key, value] of Object.entries(configuration.values)) params.set(key, String(value));
  url.hash = `/version/${configuration.versionId}?${params}`;
  return url.href;
}
export function versionTools(
  version: PrototypeVersion,
  pilot: HTMLElement,
  data: Catalog,
): HTMLElement {
  const current = (): LocalConfiguration => ({
    ideaId: version.ideaId,
    versionId: version.id,
    variantId: pilot.querySelector<HTMLSelectElement>('[name="variant"]')?.value ?? '',
    values: {
      size: Number(pilot.querySelector<HTMLInputElement>('[name="size"]')?.value),
      blinkHz: Number(pilot.querySelector<HTMLInputElement>('[name="blinkHz"]')?.value),
      warningSeconds: Number(
        pilot.querySelector<HTMLInputElement>('[name="warningSeconds"]')?.value,
      ),
      scrollSpeed: Number(pilot.querySelector<HTMLInputElement>('[name="scrollSpeed"]')?.value),
    },
  });
  const panel = node('section', '', 'version-tools');
  panel.append(
    node('h2', 'Konfiguration teilen'),
    node(
      'p',
      'Der Link enthält diese Version, das Konzept und alle effektiven Reglerwerte. Lokale Preset-IDs werden nicht benötigt.',
    ),
  );
  const prepare = node('button', 'Share-Link erzeugen');
  prepare.type = 'button';
  const label = node('label', 'Share-Link');
  const input = node('input');
  input.readOnly = true;
  input.name = 'share-link';
  label.append(input);
  const open = link('Konfiguration öffnen', '#');
  open.hidden = true;
  prepare.addEventListener('click', () => {
    input.value = shareConfiguration(current(), window.location.href);
    open.href = input.value;
    open.hidden = false;
  });
  panel.append(prepare, label, open, reviewForm(current, data));
  return panel;
}
export function reviewForm(current: () => LocalConfiguration, data: Catalog): HTMLElement {
  const panel = node('section', '', 'local-review');
  panel.append(
    node('h2', 'Feedback & Entscheidung · lokal/unveröffentlicht'),
    node(
      'p',
      'Bewertung erfasst Version, Konzept, aktuelle Werte und Datum. Eine lokale Auswahl ist noch keine veröffentlichte Director-Freigabe.',
    ),
  );
  const form = node('form', '', 'draft-form');
  const fields = new Map<string, HTMLTextAreaElement>();
  for (const [key, title] of [
    ['likes', 'Was gefällt'],
    ['dislikes', 'Was stört'],
    ['desiredChange', 'Gewünschte Änderung'],
    ['decisionSource', 'Entscheidungsquelle / Begründung'],
  ] as const) {
    const label = node('label', title),
      input = node('textarea');
    input.name = key;
    input.maxLength = 4000;
    input.rows = 2;
    label.append(input);
    fields.set(key, input);
    form.append(label);
  }
  const label = node('label', 'Lokale Entscheidung');
  const choice = node('select');
  choice.name = 'decision';
  for (const [id, title] of [
    ['open', 'Offen'],
    ['selected', 'Ausgewählt · lokal'],
    ['rejected', 'Verworfen · lokal'],
  ]) {
    const option = node('option', title);
    option.value = id;
    choice.append(option);
  }
  label.append(choice);
  form.append(label);
  const save = node('button', 'Review lokal speichern');
  save.type = 'submit';
  const status = node('p');
  status.setAttribute('role', 'status');
  form.append(save, status);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const review = Object.fromEntries(
      [...fields].map(([key, input]) => [key, input.value.trim()]),
    ) as unknown as ReviewDetails;
    review.decision = choice.value as ReviewDetails['decision'];
    if (![review.likes, review.dislikes, review.desiredChange].some(Boolean)) {
      status.textContent = 'Bitte Feedback eintragen.';
      return;
    }
    const bundle = localDrafts.snapshot();
    bundle.feedback.push({
      id: crypto.randomUUID(),
      ...current(),
      date: new Date().toISOString(),
      text: 'Strukturiertes lokales Review',
      review,
    });
    const result = localDrafts.update(bundle);
    status.textContent = result.ok ? localDrafts.message : result.errors.join(' ');
    status.setAttribute('role', result.ok ? 'status' : 'alert');
    if (result.ok) {
      form.reset();
      list.replaceChildren(...reviewCards(data, false));
    }
  });
  const list = node('div');
  list.append(...reviewCards(data, false));
  panel.append(form, list);
  return panel;
}
function reviewCards(data: Catalog, published: boolean): HTMLElement[] {
  const records = published
    ? data.reviews
    : localDrafts.snapshot().feedback.filter((n) => n.review);
  return records.map((record) => {
    const card = node('article');
    const review = record.review;
    if (!review) return card;
    card.append(
      link(
        `${record.versionId} · ${record.variantId}`,
        `#/version/${record.versionId}?variant=${record.variantId}&${new URLSearchParams(Object.entries(record.values ?? {}).map(([k, v]) => [k, String(v)]))}`,
      ),
      node('p', `${record.date} · ${published ? 'publiziert' : 'lokal/unveröffentlicht'}`),
      node('p', `Effektive Werte: ${JSON.stringify(record.values)}`),
    );
    for (const [label, value] of [
      ['Gefällt', review.likes],
      ['Stört', review.dislikes],
      ['Gewünschte Änderung', review.desiredChange],
      [
        'Entscheidung',
        { open: 'Offen', selected: 'Ausgewählt', rejected: 'Verworfen' }[review.decision],
      ],
      ['Entscheidungsquelle', review.decisionSource],
    ])
      card.append(node('p', `${label}: ${value || 'nicht angegeben'}`));
    if ('sourceUrl' in record && typeof record.sourceUrl === 'string')
      card.append(link('Belegte Reviewquelle', record.sourceUrl));
    return card;
  });
}
export function reviewsOverview(data: Catalog): HTMLElement[] {
  const published = node('section');
  published.append(node('h2', 'Publizierte Reviews & Entscheidungen'));
  published.append(...reviewCards(data, true));
  if (!data.reviews.length)
    published.append(
      node(
        'p',
        'Noch keine veröffentlichten Reviews oder Auswahlentscheidungen. Repository-Daten veröffentlichen nur belegtes Feedback.',
      ),
    );
  const local = node('section');
  local.append(node('h2', 'Lokale Reviews · unveröffentlicht'), ...reviewCards(data, false));
  if (!localDrafts.snapshot().feedback.some((n) => n.review))
    local.append(
      node(
        'p',
        'Noch keine lokalen Reviews. Feedback kann in einer konkreten Version erfasst werden.',
      ),
    );
  return [
    published,
    local,
    link('Zu den Versionen und ihrem Dev Log', '#/idea/delivery-arrow-study'),
  ];
}
