import { resolve } from 'node:path';
import { openAssetSession } from './AssetEntrypoints.ts';
import { inspectRuntimePackage } from './AssetPackage.ts';

const root = resolve('.');
const session = await openAssetSession(root);
try {
  const result = await inspectRuntimePackage(root, resolve(process.argv[2] ?? 'dist'));
  console.log(`Managed production package verified: ${JSON.stringify(result)}`);
} finally {
  await session.close();
}
