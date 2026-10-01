import { assetDetail } from './assetGallery';
import { catalog, type Element } from './catalog';
import { backlinkView, referenceDetail, searchForm, searchView, specialView } from './catalogViews';
import { elementDetail } from './elementDetail';
import { mediaImage } from './media';
import { resolveRoute, sections } from './navigation';
import { documentationLabels, link, node, repository } from './ui';
import './styles.css';

function preview(element: Element): HTMLElement {
  if (element.previewArtifactId) return mediaImage(element.previewArtifactId, element.name);
  return node(
    'div',
    element.type === 'Mechanik'
      ? 'Mechanik · keine eigene Bilddatei'
      : 'Codegrafik · kein separates Bild',
    'media media-empty',
  );
}

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
    'Vorhandene Elemente, Quellen und fachliche Kategorien. Die Stichprobe umfasst Kurierin, Red Missile sowie Paket, Empfänger, Lieferpfeil und Liefermechanik.',
    'lead',
  );
  const heading = node('h2', 'Kategorien');
  const categories = node('div', '', 'category-grid');
  for (const category of catalog.categories) {
    const count = catalog.elements.filter((element) => element.categoryId === category.id).length;
    const card = link('', `#/documentation/${category.id}`, 'category-card');
    card.append(
      node('strong', category.name),
      node(
        'span',
        count ? `${count} ${count === 1 ? 'Element' : 'Elemente'}` : 'Noch nicht dokumentiert',
      ),
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
  navigation.append(searchForm(), link('Referenzen', '#/references'), link('Effekte', '#/effects'));
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
    view.append(
      elementDetail(route.element, catalog, preview(route.element)),
      backlinkView(route.element.id),
    );
  } else if (route.kind === 'asset') {
    view.append(assetDetail(route.asset, catalog), backlinkView(route.asset.id));
  } else if (route.kind === 'search') {
    view.append(...searchView(catalog, window.location.hash));
  } else if (route.kind === 'reference') {
    view.append(...referenceDetail(route.reference));
  } else if (route.kind === 'references' || route.kind === 'effects') {
    view.append(...specialView(catalog, route.kind));
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
