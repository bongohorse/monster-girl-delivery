import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('../workshop', import.meta.url)),
  base: command === 'serve' ? '/workshop/' : './',
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('../dist-workshop', import.meta.url)),
    emptyOutDir: true,
  },
  server: { host: '0.0.0.0', port: 8081, strictPort: true },
}));
