import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// CommandRunner propagates this Stryker activation variable into each fresh Vitest process.
const id = process.env.__STRYKER_ACTIVE_MUTANT__ ?? 'baseline';
const directory = process.env.MGD_MUTATION_EVIDENCE_DIR;
const baselineReportPath = process.env.MGD_MUTATION_BASELINE_REPORT;
if (!directory || !baselineReportPath) {
  throw new Error('Run this command through the Stryker Collectibles audit workflow.');
}

const baselineReport = JSON.parse(readFileSync(baselineReportPath, 'utf8'));
const expectedAssertions = baselineReport.testResults.flatMap(
  (suite) => suite.assertionResults,
).length;
if (expectedAssertions <= 0) {
  throw new Error('Focused mutation baseline did not contain test assertions.');
}

mkdirSync(directory, { recursive: true });
const reportPath = join(directory, `${id}.vitest.json`);
const child = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    'tests/systems/PrototypeCollectiblesAuthorityAudit.test.ts',
    'tests/systems/PrototypeCollectibles.test.ts',
    'tests/systems/PrototypeBroadphaseWorkEvidence.test.ts',
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
  const complete =
    completed.length === expectedAssertions && assertions.length === expectedAssertions;
  evidence = {
    id,
    exitCode: child.status,
    expected: expectedAssertions,
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
  evidence = {
    id,
    kind: 'RuntimeError',
    expected: expectedAssertions,
    completed: 0,
    error: String(error),
  };
}
writeFileSync(join(directory, `${id}.evidence.json`), `${JSON.stringify(evidence, null, 2)}\n`);
if (evidence.kind !== 'Passed') {
  console.error(JSON.stringify(evidence));
  if (evidence.kind === 'RuntimeError') console.error(child.stderr, child.stdout);
  process.exit(1);
}
