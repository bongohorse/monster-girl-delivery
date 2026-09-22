import { defineConfig } from 'vite';
import { createBuildDefines } from './buildMetadata.mjs';

const phasermsg = () => {
  return {
    name: 'phasermsg',

    buildStart() {
      process.stdout.write(`Building for production...\n`);
    },

    buildEnd() {
      const line = '---------------------------------------------------------';
      const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;

      process.stdout.write(`${line}\n${msg}\n${line}\n`);
      process.stdout.write(`✨ Done ✨\n`);
    },
  };
};

const androidDirectorBuild = process.env.MGD_ANDROID_DIRECTOR_BUILD === '1';

export default defineConfig({
  base: './',

  define: {
    ...createBuildDefines(),
    ...(androidDirectorBuild ? { 'import.meta.env.DEV': 'true' } : {}),
  },

  logLevel: 'warning',

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

    minify: 'terser',

    terserOptions: {
      compress: {
        passes: 2,
      },

      mangle: true,

      format: {
        comments: false,
      },
    },
  },

  server: {
    port: 8080,
  },

  plugins: [phasermsg()],
});
