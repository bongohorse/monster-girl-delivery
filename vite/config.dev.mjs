import { defineConfig } from 'vite';
import { createBuildDefines } from './buildMetadata.mjs';

export default defineConfig({
  base: './',
  define: createBuildDefines(),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 8080,
  },
});
