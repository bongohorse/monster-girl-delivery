import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { assertCatalogFiles } from '../scripts/workshop/CatalogFiles.ts';
import { workshopMediaPlugin } from '../scripts/workshop/WorkshopMedia.ts';
import { catalog } from '../workshop/src/catalog.ts';
import { createCatalogIndex } from '../workshop/src/search.ts';

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('../workshop', import.meta.url)),
  base: command === 'serve' ? '/workshop/' : './',
  publicDir: false,
  define: { __WORKSHOP_CATALOG_INDEX__: JSON.stringify(createCatalogIndex(catalog)) },
  plugins: [
    {
      name: 'workshop-catalog-check',
      async configResolved() {
        await assertCatalogFiles(fileURLToPath(new URL('..', import.meta.url)), catalog);
      },
    },
    workshopMediaPlugin(fileURLToPath(new URL('..', import.meta.url))),
  ],
  build: {
    outDir: fileURLToPath(new URL('../dist-workshop', import.meta.url)),
    emptyOutDir: true,
  },
  server: { host: '0.0.0.0', port: 8081, strictPort: true },
}));
