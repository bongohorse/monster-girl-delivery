import { resolve } from 'node:path';
import { runAssetConsumer } from './AssetEntrypoints.ts';

const tools: Record<string, string> = {
  typecheck: 'typescript/bin/tsc',
  test: 'vitest/vitest.mjs',
  build: 'vite/bin/vite.js',
};
const [task, ...args] = process.argv.slice(2);
if (!task || !tools[task]) throw new Error('Expected asset consumer: typecheck, test or build.');
process.exitCode = await runAssetConsumer(process.cwd(), process.execPath, [
  resolve('node_modules', tools[task]),
  ...args,
]);
