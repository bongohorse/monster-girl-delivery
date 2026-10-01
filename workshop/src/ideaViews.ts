import { controlPreview } from '../prototypes/delivery-arrow/controls-v0/model';
import { controlsPreview } from '../prototypes/delivery-arrow/controls-v0/view';
import type { Catalog, Idea } from './catalog';
import { downloadText } from './download';
import {
  createDraft,
  type Draft,
  type LocalConfiguration,
  maxImportBytes,
  parseLocalData,
  serializeLocalData,
} from './localData';
import { localDrafts } from './localSession';
import { link, node, repository, sourceLink } from './ui';

const button = (text: string, action: () => void) => {
  const item = node('button', text);
  item.type = 'button';
  item.addEventListener('click', action);
  return item;
};
export function createIdeaButton(data: Catalog, elementIds: string[] = []): HTMLButtonElement {
  return button(elementIds.length ? 'Idee aus diesem Element' : 'Freie Idee anlegen', () => {
    const draft = createDraft(data, elementIds, crypto.randomUUID(), new Date().toISOString());
    const bundle = localDrafts.snapshot();
    bundle.drafts.push(draft);
    const result = localDrafts.update(bundle);
    if (result.ok) window.location.hash = `/draft/${draft.id}`;
    else {
      const message = node('p', result.errors.join(' '));
      message.setAttribute('role', 'alert');
      document.getElementById('view')?.append(message);
    }
  });
}
export function elementIdeas(data: Catalog, elementId: string): HTMLElement {
  const panel = node('section');
  panel.append(node('h2', 'Verknüpfte Ideen'), createIdeaButton(data, [elementId]));
  const list = node('ul');
  for (const idea of data.ideas.filter((idea) => idea.elementIds.includes(elementId))) {
    const item = node('li');
    item.append(link(`${idea.name} · Repository-Entwurf`, `#/idea/${idea.id}`));
    list.append(item);
  }
  for (const draft of localDrafts
    .snapshot()
    .drafts.filter((draft) => draft.origins.some((o) => o.elementId === elementId))) {
    const item = node('li');
    item.append(link(`${draft.name} · lokal/unveröffentlicht`, `#/draft/${draft.id}`));
    list.append(item);
  }
  panel.append(
    list,
    node('p', 'Keine Auswahlentscheidung oder Spielintegration aus diesen Ideen abgeleitet.'),
  );
  return panel;
}
export function dataTransfer(
  data: Catalog,
  refresh: () => void,
  currentConfig?: () => LocalConfiguration,
): HTMLElement {
  const panel = node('section', '', 'local-transfer');
  panel.append(node('h2', 'Lokale Daten sichern / importieren'));
  panel.append(
    node(
      'p',
      currentConfig
        ? 'JSON sichert Entwürfe, Notizen, Presets und den aktuellen Reglerstand als zusätzliches Preset „Exportierte Vorschau“. Alles bleibt lokal/unveröffentlicht.'
        : 'JSON sichert gespeicherte lokale Entwürfe, Notizen und Presets. Es schreibt nichts ins Repository.',
    ),
  );
  const status = node(
    'p',
    localDrafts.message ||
      'Lokale Daten gehören nur zu diesem Browser; bitte wichtige Entwürfe exportieren.',
  );
  status.setAttribute('role', 'status');
  panel.append(
    button('JSON exportieren', () => {
      const bundle = localDrafts.snapshot();
      if (currentConfig)
        bundle.presets.push({
          id: crypto.randomUUID(),
          name: 'Exportierte Vorschau',
          ...currentConfig(),
          date: new Date().toISOString(),
        });
      const json = serializeLocalData(bundle);
      const result = parseLocalData(json, data);
      if (!result.ok) {
        status.textContent = result.errors.join(' ');
        status.setAttribute('role', 'alert');
        return;
      }
      downloadText('mgd-workshop-local.json', json, 'application/json');
      status.textContent = 'Lokales JSON exportiert; keine Veröffentlichung.';
    }),
  );
  const form = node('form', '', 'draft-form');
  const label = node('label', 'JSON-Import (ersetzt alle lokalen Workshop-Daten)');
  const input = node('textarea');
  input.name = 'local-json';
  input.rows = 5;
  input.required = true;
  label.append(input);
  const fileLabel = node('label', 'Optional JSON-Datei laden');
  const file = node('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  fileLabel.append(file);
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    if (selected.size > maxImportBytes) {
      status.textContent = 'Datei ist größer als 512 KiB.';
      status.setAttribute('role', 'alert');
      return;
    }
    try {
      input.value = await selected.text();
      status.textContent = 'Datei geladen. Erst der Import ersetzt lokale Daten.';
    } catch {
      status.textContent = 'Datei konnte nicht gelesen werden.';
      status.setAttribute('role', 'alert');
    }
  });
  const submit = node('button', 'JSON importieren und lokale Daten ersetzen');
  submit.type = 'submit';
  form.append(
    label,
    fileLabel,
    node(
      'p',
      'Ein gültiger vollständiger Import ersetzt Entwürfe, Notizen und Presets. Vorher bei Bedarf exportieren. Fehler lassen vorhandene Daten unverändert.',
    ),
    submit,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = localDrafts.importJSON(input.value);
    if (!result.ok) {
      status.textContent = result.errors.join(' ');
      status.setAttribute('role', 'alert');
    } else refresh();
  });
  panel.append(form, status);
  return panel;
}
export function ideasOverview(data: Catalog, refresh: () => void): HTMLElement[] {
  const cards = node('div', '', 'card-grid');
  for (const idea of data.ideas) {
    const card = link('', `#/idea/${idea.id}`, 'card idea-card');
    card.append(
      node('span', 'Repository-Idee · Entwurf', 'tag'),
      node('h2', idea.name),
      node('p', idea.question),
    );
    cards.append(card);
  }
  const local = node('ul', '', 'local-draft-list');
  for (const draft of localDrafts.snapshot().drafts) {
    const item = node('li');
    item.append(link(draft.name, `#/draft/${draft.id}`));
    local.append(item);
  }
  if (!local.children.length) local.append(node('li', 'Noch keine lokalen Entwürfe.'));
  return [
    node(
      'p',
      'Prototype Lab: eigene Fragen und Entwürfe, getrennt von Produktionsspiel und veröffentlichten Entscheidungen.',
      'lead',
    ),
    createIdeaButton(data),
    node('h2', 'Ideen aus Repository-Daten'),
    cards,
    node('h2', 'Lokale Entwürfe · unveröffentlicht'),
    local,
    dataTransfer(data, refresh),
  ];
}
export function localNotes(ideaId: string, currentConfig?: () => LocalConfiguration): HTMLElement {
  const panel = node('section');
  panel.append(node('h2', 'Lokale Notizen · unveröffentlicht'));
  const list = node('ul', '', 'local-notes');
  const render = () => {
    list.replaceChildren();
    for (const note of localDrafts.snapshot().feedback.filter((n) => n.ideaId === ideaId)) {
      const item = node('li');
      item.append(
        node('p', note.text),
        node(
          'small',
          `${note.date}${note.versionId ? ` · ${note.versionId} / ${note.variantId} · ${JSON.stringify(note.values)}` : ''}`,
        ),
      );
      list.append(item);
    }
    if (!list.children.length) list.append(node('li', 'Noch keine lokalen Notizen.'));
  };
  const form = node('form', '', 'draft-form');
  const label = node('label', 'Notiz');
  const text = node('textarea');
  text.name = 'note';
  text.maxLength = 4000;
  text.required = true;
  text.rows = 3;
  label.append(text);
  const submit = node('button', 'Notiz lokal speichern');
  submit.type = 'submit';
  const status = node('p');
  status.setAttribute('role', 'status');
  form.append(label, submit, status);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!text.value.trim()) return;
    const bundle = localDrafts.snapshot();
    bundle.feedback.push({
      id: crypto.randomUUID(),
      ideaId,
      text: text.value.trim(),
      date: new Date().toISOString(),
      versionId: currentConfig?.().versionId ?? null,
      variantId: currentConfig?.().variantId ?? null,
      values: currentConfig?.().values ?? null,
    });
    const result = localDrafts.update(bundle);
    status.textContent = result.ok ? localDrafts.message : result.errors.join(' ');
    status.setAttribute('role', result.ok ? 'status' : 'alert');
    if (result.ok) {
      text.value = '';
      render();
    }
  });
  render();
  panel.append(
    list,
    form,
    node('p', 'Notizen sind kein publiziertes Review und keine Auswahlentscheidung.'),
  );
  return panel;
}
export function ideaDetail(idea: Idea, data: Catalog, refresh: () => void): HTMLElement[] {
  const relations = node('ul');
  for (const id of idea.elementIds) {
    const element = data.elements.find((e) => e.id === id);
    if (element) {
      const item = node('li');
      item.append(link(element.name, `#/element/${id}`));
      relations.append(item);
    }
  }
  for (const id of idea.referenceIds) {
    const reference = data.references.find((r) => r.id === id);
    if (reference) {
      const item = node('li');
      item.append(link(reference.name, `#/reference/${id}`));
      relations.append(item);
    }
  }
  const result = [
    node('span', 'Repository-Idee · Entwurf · keine Nutzerfreigabe', 'tag'),
    node('p', idea.question, 'lead'),
    node('h2', 'Ausgangselemente / Referenzen'),
    relations,
  ];
  const preview =
    idea.prototypeId === controlPreview.versionId
      ? controlsPreview(localDrafts, window.location.hash)
      : null;
  if (preview) result.push(preview.element);
  else result.push(node('p', 'Für diese Idee ist noch kein ausführbarer Prototyp registriert.'));
  const currentConfig = preview
    ? () => ({
        ideaId: controlPreview.ideaId,
        versionId: controlPreview.versionId,
        variantId: controlPreview.variantId,
        values: preview.values(),
      })
    : undefined;
  result.push(localNotes(idea.id, currentConfig), dataTransfer(data, refresh, currentConfig));
  for (const version of data.versions.filter((v) => v.ideaId === idea.id))
    result.push(
      link(`Interaktiver Pilot: ${version.name}`, `#/version/${version.id}`, 'pilot-link'),
    );
  return result;
}
export function draftCommand(draft: Draft, data: Catalog): string {
  const sourceLines = draft.origins.flatMap((origin) => [
    `- ${origin.elementId} · Dokumentationsrevision ${origin.revision}`,
    ...origin.sources.map(
      (s) =>
        `  - ${s.path}${s.symbol ? ` (${s.symbol})` : ''}: ${repository}/blob/${s.revision}/${s.path.split('/').map(encodeURIComponent).join('/')}`,
    ),
  ]);
  return [
    `# Lokaler Codex-Auftrag: ${draft.name}`,
    '',
    'Entwurf / unveröffentlicht. Keine Auswahlentscheidung oder automatische Spielintegration.',
    '',
    '## Fragestellung',
    draft.question || '(noch offen)',
    '',
    '## Gewünschte Änderung',
    draft.desiredChange || '(noch offen)',
    '',
    '## Zu bewahrende Eigenschaften',
    draft.preserve || '(noch offen)',
    '',
    '## Ausgangselemente und Quellen',
    ...sourceLines,
    ...(sourceLines.length ? [] : ['Freie Idee ohne Ausgangselement.']),
    '',
    '## Referenzen',
    ...draft.referenceIds.map((id) => {
      const ref = data.references.find((r) => r.id === id);
      return `- ${ref?.name ?? id}: #/reference/${id}`;
    }),
    '',
    'Bitte aus diesem Entwurf eine separat beauftragte kleine Studie entwickeln. Produktionsregeln und Freigaben nicht aus Vorschauwerten ableiten.',
    '',
  ].join('\n');
}
export function draftDetail(draft: Draft, data: Catalog, refresh: () => void): HTMLElement[] {
  const form = node('form', '', 'draft-form');
  const status = node('p', localDrafts.message);
  status.setAttribute('role', 'status');
  const fields = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
  for (const [key, title, value, max, multiline] of [
    ['name', 'Name', draft.name, 160, false],
    ['question', 'Fragestellung', draft.question, 4000, true],
    ['desiredChange', 'Gewünschte Änderung', draft.desiredChange, 4000, true],
    ['preserve', 'Zu bewahrende Eigenschaften', draft.preserve, 4000, true],
    ['tags', 'Tags (durch Komma getrennt)', draft.tags.join(', '), 1000, false],
  ] as const) {
    const label = node('label', title);
    const input = multiline ? node('textarea') : node('input');
    input.name = key;
    input.value = value;
    input.maxLength = max;
    if (input instanceof HTMLTextAreaElement) input.rows = 3;
    if (key === 'name') input.required = true;
    label.append(input);
    form.append(label);
    fields.set(key, input);
  }
  const select = (
    name: string,
    title: string,
    options: { id: string; name: string }[],
    selected: string[],
    multiple = false,
  ) => {
    const label = node('label', title);
    const input = node('select');
    input.name = name;
    input.multiple = multiple;
    if (multiple) input.size = Math.min(6, Math.max(2, options.length));
    for (const option of options) {
      const item = node('option', option.name);
      item.value = option.id;
      item.selected = selected.includes(option.id);
      input.append(item);
    }
    label.append(input);
    form.append(label);
    return input;
  };
  const category = select('category', 'Kategorie', data.categories, [draft.categoryId]);
  const origins = select(
    'origins',
    'Ausgangselemente (mehrere wählbar)',
    data.elements,
    draft.origins.map((o) => o.elementId),
    true,
  );
  const references = select('references', 'Referenzen', data.references, draft.referenceIds, true);
  const save = node('button', 'Entwurf lokal speichern');
  save.type = 'submit';
  form.append(save, status);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = [...origins.selectedOptions].map((o) => o.value);
    const newOrigins = createDraft(data, selected, draft.id, draft.date).origins.map(
      (o) => draft.origins.find((old) => old.elementId === o.elementId) ?? o,
    );
    const edited: Draft = {
      ...draft,
      name: fields.get('name')?.value.trim() ?? draft.name,
      question: fields.get('question')?.value ?? '',
      desiredChange: fields.get('desiredChange')?.value ?? '',
      preserve: fields.get('preserve')?.value ?? '',
      tags: (fields.get('tags')?.value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      categoryId: category.value,
      origins: newOrigins,
      referenceIds: [...references.selectedOptions].map((o) => o.value),
      date: new Date().toISOString(),
    };
    const bundle = localDrafts.snapshot();
    bundle.drafts = bundle.drafts.map((d) => (d.id === draft.id ? edited : d));
    const result = localDrafts.update(bundle);
    if (result.ok) refresh();
    else {
      status.textContent = result.errors.join(' ');
      status.setAttribute('role', 'alert');
    }
  });
  const sources = node('section');
  sources.append(node('h2', 'Festgehaltene Ausgangsrevisionen'));
  for (const origin of draft.origins) {
    sources.append(
      link(origin.elementId, `#/element/${origin.elementId}`),
      node('p', origin.revision),
    );
    const list = node('ul');
    for (const source of origin.sources) {
      const item = node('li');
      item.append(sourceLink(source));
      list.append(item);
    }
    sources.append(list);
  }
  return [
    node('span', 'Lokaler Entwurf · unveröffentlicht', 'tag'),
    node(
      'p',
      'Neue Ausgangselemente übernehmen ihre Dokumentationsrevision. Bereits festgehaltene Revisionen und Quellen bleiben beim Bearbeiten erhalten.',
    ),
    form,
    button('Codex-Auftrag als Markdown exportieren', () =>
      downloadText(`${draft.id}-codex-auftrag.md`, draftCommand(draft, data), 'text/markdown'),
    ),
    sources,
    localNotes(draft.id),
    dataTransfer(data, refresh),
  ];
}
