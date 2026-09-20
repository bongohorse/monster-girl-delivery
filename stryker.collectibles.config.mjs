/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
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
