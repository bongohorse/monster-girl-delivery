import { execFileSync } from 'node:child_process';

const readGitCommit = () => {
  const ciCommit = process.env.GITHUB_SHA?.trim();
  if (ciCommit) {
    return ciCommit.slice(0, 12);
  }

  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
};

export const createBuildDefines = () => ({
  __MGD_BUILD_COMMIT__: JSON.stringify(readGitCommit()),
});
