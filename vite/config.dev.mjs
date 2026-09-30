import { defineConfig } from 'vite';
import { assetPipelinePlugin } from '../scripts/assets/AssetEntrypoints.ts';
import { createBuildDefines } from './buildMetadata.mjs';

export default defineConfig({
  base: './',
  plugins: [assetPipelinePlugin()],
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
