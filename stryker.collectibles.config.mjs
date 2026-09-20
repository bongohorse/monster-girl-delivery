import { readFileSync } from 'node:fs';

// TS 7 no longer exposes the compiler API used by Stryker's tsconfig rewriter.
// This self-contained config needs no path rewriting; keep it intact in the sandbox.
const tsconfig = readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8');
if (/"(?:extends|references)"\s*:/.test(tsconfig)) {
  throw new Error('Reassess the Stryker TS 7 workaround before using tsconfig extends/references.');
}

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  tsconfigFile: '',
  incremental: false,
  coverageAnalysis: 'perTest',
  concurrency: 2,
  cleanTempDir: 'always',
  disableTypeChecks: true,
  ignoreStatic: false,
  timeoutMS: 8_000,
  timeoutFactor: 2,
  thresholds: {
    high: 0,
    low: 0,
    break: null,
  },
  reporters: ['clear-text', 'json', 'html'],
  jsonReporter: {
    fileName: 'reports/mutation/collectibles/mutation.json',
  },
  htmlReporter: {
    fileName: 'reports/mutation/collectibles/index.html',
  },
  mutate: [
    'src/systems/PrototypeCollectibles.ts:21-56',
    'src/systems/PrototypeCollectibles.ts:147-275',
    'src/systems/PrototypeCollectibles.ts:350-416',
  ],
  vitest: {
    related: true,
  },
};
