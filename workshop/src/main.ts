import missilePreview from '../../assets/source/district-01/hazards/red-monster-missile-gpt-image.png?url';
import courierPreview from '../../public/assets/art-gate/pose-a-concept-preview.png?url';
import { catalog, type Element } from './catalog';
import { resolveRoute, sections } from './navigation';
import './styles.css';

const previews: Record<string, string> = {
  'public/assets/art-gate/pose-a-concept-preview.png': courierPreview,
  'assets/source/district-01/hazards/red-monster-missile-gpt-image.png': missilePreview,
};
const repository = 'https://github.com/bongohorse/monster-girl-delivery';

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.textContent = text;
  result.className = className;
  return result;
}

function link(text: string, href: string, className = ''): HTMLAnchorElement {
  const result = node('a', text, className);
  result.href = href;
  return result;
}

function sourceLink(path: string): HTMLAnchorElement {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return link(path, `${repository}/blob/${catalog.codeReviewRevision}/${encoded}`);
}

function preview(element: Element): HTMLElement {
  const url = element.previewPath && previews[element.previewPath];
  if (!url) {
    return node('div', 'Codegrafik · kein separates Bild', 'media media-empty');
  }
  const image = node('img', '', 'media');
  image.src = url;
  image.alt = `${element.name} · vorhandene Konzeptquelle`;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener(
    'error',
    () => {
      image.replaceWith(node('div', 'Vorschau nicht verfügbar', 'media media-empty'));
    },
    { once: true },
  );
  return image;
}

const implementationLabels: Record<string, string> = {
  planned: 'geplant',
  partial: 'teilweise umgesetzt',
  implemented: 'umgesetzt',
};

const documentationLabels: Record<string, string> = {
  checked: 'Dokumentation geprüft',
  'source-conflict': 'Quellenkonflikt',
  unchecked: 'Dokumentation ungeprüft',
};

function elementCard(element: Element): HTMLAnchorElement {
  const card = link('', `#/element/${element.id}`, 'card element-card');
  card.append(preview(element));
  const content = node('div', '', 'card-content');
  content.append(
    node('span', element.type, 'eyebrow'),
    node('h3', element.name),
    node('p', element.description),
    node(
      'span',
      documentationLabels[element.documentation.state] ?? 'Dokumentation ungeprüft',
      'tag',
    ),
  );
  card.append(content);
  return card;
}

function elementGrid(elements: Element[]): HTMLElement {
  const grid = node('div', '', 'card-grid');
  for (const element of elements) grid.append(elementCard(element));
  return grid;
}

function documentation(): HTMLElement[] {
  const intro = node(
    'p',
    'Vorhandene Elemente, Quellen und fachliche Kategorien. Die Stichprobe enthält eine Kurierin, Red Missile und den Lieferpfeil.',
    'lead',
  );
  const heading = node('h2', 'Kategorien');
  const categories = node('div', '', 'category-grid');
  for (const category of catalog.categories) {
    const count = catalog.elements.filter((element) => element.categoryId === category.id).length;
    const card = link('', `#/documentation/${category.id}`, 'category-card');
    card.append(
      node('strong', category.name),
      node('span', count ? `${count} Element` : 'Noch nicht dokumentiert'),
    );
    categories.append(card);
  }
  return [intro, heading, categories, node('h2', 'Erste Einblicke'), elementGrid(catalog.elements)];
}

function pendingSection(section: string): HTMLElement[] {
  const copy: Record<string, [string, string]> = {
    ideas: [
      'Prototype Lab',
      'Freie Ideen und interaktive Studien folgen ab Aufgabe 6. Der Lieferpfeil-Pilot ist noch nicht ausführbar.',
    ],
    reviews: [
      'Noch keine veröffentlichten Reviews',
      'Feedback und Entscheidungen folgen in Aufgabe 8. Es liegt keine Workshop-Auswahlentscheidung vor.',
    ],
    integration: [
      'Noch kein Integrations-Handoff',
      'Exporte aus konkreten Prototyp-Einstellungen folgen in Aufgabe 9. Eine Spielintegration wird separat beauftragt.',
    ],
  };
  const content = copy[section];
  if (!content) return [];
  const panel = node('section', '', 'empty-panel');
  panel.append(
    node('span', 'Noch nicht umgesetzt', 'tag'),
    node('h2', content[0]),
    node('p', content[1]),
    link('Zur dokumentierten Stichprobe →', '#/documentation'),
  );
  return [panel];
}

const view = document.getElementById('view');
const navigation = document.getElementById('primary-navigation');
const breadcrumbs = document.getElementById('breadcrumbs');
const main = document.getElementById('main-content');
const revision = document.getElementById('revision');
if (!view || !navigation || !breadcrumbs || !main || !revision) {
  throw new Error('Workshop-Einstieg ist unvollständig.');
}
revision.append(
  link(
    catalog.codeReviewRevision.slice(0, 12),
    `${repository}/commit/${catalog.codeReviewRevision}`,
  ),
);

function render(moveFocus = false): void {
  if (!view || !navigation || !breadcrumbs || !main) return;
  const route = resolveRoute(window.location.hash, catalog);
  document.title = `${route.title} · MGD Workshop`;
  navigation.replaceChildren();
  for (const section of sections) {
    const item = link(section.name, `#/${section.id}`, 'nav-link');
    if (section.id === route.section) item.setAttribute('aria-current', 'page');
    if ('subtitle' in section) item.append(node('small', section.subtitle));
    navigation.append(item);
  }
  const list = node('ol');
  for (const crumb of route.breadcrumbs) {
    const item = node('li');
    if (crumb.href) item.append(link(crumb.label, crumb.href));
    else {
      item.textContent = crumb.label;
      item.setAttribute('aria-current', 'page');
    }
    list.append(item);
  }
  breadcrumbs.replaceChildren(list);
  view.replaceChildren(node('span', 'MGD Workshop', 'eyebrow'), node('h1', route.title));
  if (route.kind === 'section') {
    view.append(
      ...(route.section === 'documentation'
        ? documentation()
        : pendingSection(route.section ?? '')),
    );
  } else if (route.kind === 'category') {
    const elements = catalog.elements.filter((element) => element.categoryId === route.category.id);
    view.append(
      node(
        'p',
        elements.length
          ? 'Belegte Stichprobe aus dem bestehenden Spiel.'
          : 'Noch nicht dokumentiert. In dieser Kategorie wurden noch keine Elemente erfasst.',
        'lead',
      ),
      elementGrid(elements),
    );
  } else if (route.kind === 'element') {
    const element = route.element;
    const panel = node('section', '', 'detail-panel');
    panel.append(preview(element), node('p', element.description, 'lead'));
    const status = node('p', '', 'status-row');
    status.append(
      node(
        'span',
        documentationLabels[element.documentation.state] ?? 'Dokumentation ungeprüft',
        'tag',
      ),
      node(
        'span',
        `Implementierung: ${implementationLabels[element.implementation] ?? 'ungeprüft'}`,
        'tag',
      ),
    );
    panel.append(
      status,
      node('p', `${element.documentation.date} · ${element.documentation.notes}`),
      node('h2', 'Quellen der Stichprobe'),
    );
    const sources = node('ul', '', 'source-list');
    for (const source of element.sources) {
      const item = node('li');
      item.append(sourceLink(source.path));
      sources.append(item);
    }
    panel.append(
      sources,
      node(
        'p',
        'Vollständige typabhängige Details folgen in Aufgabe 3, Assetgalerien und getrennte Assetzustände in Aufgabe 4.',
        'scope-note',
      ),
    );
    view.append(panel);
  } else {
    view.append(
      node(
        'p',
        'Dieser Direktlink ist unbekannt. Wähle einen vorhandenen Bereich oder ein Element.',
        'lead',
      ),
      link('Zur Dokumentation →', '#/documentation'),
    );
  }
  if (moveFocus) main.focus();
}

window.addEventListener('hashchange', () => render(true));
// The skip link targets the existing main region without changing the routed view.
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});
render();
