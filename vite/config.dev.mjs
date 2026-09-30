import { defineConfig } from 'vite';
import { createBuildDefines } from './buildMetadata.mjs';

export default defineConfig({
  base: './',
  define: createBuildDefines(),
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'phaser',
              test: /node_modules[\\/]phaser/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 8080,
  },
});
