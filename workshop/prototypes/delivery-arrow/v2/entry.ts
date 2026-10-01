import { catalog } from '../../../src/catalog';
import { mountPilot } from './view';

const root = document.getElementById('pilot');
if (!root) throw new Error('Pilot-Einstieg fehlt.');
let mounted: ReturnType<typeof mountPilot> | undefined;
function render() {
  mounted?.dispose();
  mounted?.element.remove();
  mounted = mountPilot(catalog, render);
  root?.append(mounted.element);
}
const version = catalog.versions.find((v) => v.id === 'delivery-arrow-v2');
root.append(document.createTextNode(`Quellrevision: ${version?.sourceRevision ?? 'Arbeitsstand'}`));
render();
