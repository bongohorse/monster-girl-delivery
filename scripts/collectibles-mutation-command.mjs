import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// CommandRunner propagates this Stryker activation variable into each fresh Vitest process.
const id = process.env.__STRYKER_ACTIVE_MUTANT__ ?? 'baseline';
const directory = process.env.MGD_MUTATION_EVIDENCE_DIR;
if (!directory) throw new Error('Run this command through the Stryker Collectibles config.');
mkdirSync(directory, { recursive: true });
const reportPath = join(directory, `${id}.vitest.json`);
const child = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    'tests/systems/PrototypeCollectiblesAuthorityAudit.test.ts',
    'tests/systems/PrototypeCollectibles.test.ts',
    '--reporter=json',
    `--outputFile=${reportPath}`,
  ],
  { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
);

let evidence;
try {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const assertions = report.testResults.flatMap((suite) => suite.assertionResults);
  const failed = assertions.filter((test) => test.status === 'failed');
  const completed = assertions.filter((test) => ['passed', 'failed'].includes(test.status));
  const complete = completed.length === 17 && assertions.length === 17;
  evidence = {
    id,
    exitCode: child.status,
    completed: completed.length,
    kind:
      !complete || report.numRuntimeErrorTestSuites > 0 || child.error
        ? 'RuntimeError'
        : child.status === 0 && report.success && failed.length === 0
          ? 'Passed'
          : failed.length > 0
            ? 'TestFailure'
            : 'RuntimeError',
    failures: failed.map((test) => ({
      name: test.fullName,
      messages: test.failureMessages,
    })),
  };
} catch (error) {
  evidence = { id, kind: 'RuntimeError', completed: 0, error: String(error) };
}
writeFileSync(join(directory, `${id}.evidence.json`), `${JSON.stringify(evidence, null, 2)}\n`);
if (evidence.kind !== 'Passed') {
  console.error(JSON.stringify(evidence));
  if (evidence.kind === 'RuntimeError') console.error(child.stderr, child.stdout);
  process.exit(1);
}
