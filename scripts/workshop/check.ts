import { fileURLToPath } from 'node:url';
import { catalog } from '../../workshop/src/catalog';
import { assertCatalogFiles } from './CatalogFiles';

await assertCatalogFiles(fileURLToPath(new URL('../..', import.meta.url)), catalog);
console.log(
  `Workshop-Katalog gültig: ${catalog.elements.length} Elemente, ${catalog.assets.length} Assets, ${catalog.references.length} Referenzen. IDs, Beziehungen und Quellen an ihren Revisionen geprüft.`,
);
