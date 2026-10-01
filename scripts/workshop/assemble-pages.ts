import { cp, lstat, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Compose checked build outputs; dist remains the separate game/Capacitor package. */
export async function assemblePages(repositoryRoot: string): Promise<void> {
  const game = join(repositoryRoot, 'dist');
  const workshop = join(repositoryRoot, 'dist-workshop');
  const output = join(repositoryRoot, 'dist-pages');
  for (const directory of [game, workshop]) {
    try {
      if (!(await stat(join(directory, 'index.html'))).isFile()) throw new Error('not a file');
    } catch {
      throw new Error(
        `Pages-Eingabe fehlt: ${join(directory, 'index.html')}. Beide Builds zuerst ausführen.`,
      );
    }
  }
  try {
    await lstat(join(game, 'workshop'));
    throw new Error(
      'Pages-Pfadkollision: dist/workshop ist für den separaten Workshop reserviert.',
    );
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
  await rm(output, { recursive: true, force: true });
  await cp(game, output, { recursive: true });
  await cp(workshop, join(output, 'workshop'), { recursive: true });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await assemblePages(fileURLToPath(new URL('../..', import.meta.url)));
  console.log('Pages-Artefakt erstellt: dist-pages (Spielroot + workshop/).');
}
