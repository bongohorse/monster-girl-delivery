import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(repositoryRoot, 'android');
const gradleWrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const tasks = process.argv.slice(2);

if (tasks.length === 0) {
  console.error('Usage: node scripts/android-gradle.mjs <gradle-task> [...]');
  process.exit(2);
}

const result = spawnSync(gradleWrapper, tasks, {
  cwd: androidRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
