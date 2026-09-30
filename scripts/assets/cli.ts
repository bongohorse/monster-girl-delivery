import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { prepareAsset, previewAsset, validateAsset } from './AssetCandidate';
import { withAssetLock } from './AssetLock';
import { buildRuntime, readRuntimeBuild } from './AssetRuntime';

const usage = `MGD assets
  bun run assets:prepare --id <id> --file <image> --profile static-png
    --width <px> --height <px> --display-width <logical> --display-height <logical>
    --provenance <origin> [--padding <px>] [--sampling nearest|lanczos3]
    [--trim-alpha <0..254>] [--pivot-x <0..1>] [--pivot-y <0..1>] [--render-scale <1..2>]
  bun run assets:prepare --id <id> --update --file <image>
  bun run assets:prepare --id <id>
  bun run assets:build
  bun run assets:validate --runtime
  bun run assets:validate --id <id>
  bun run assets:preview --id <id>
Pass-through uses --profile pass-through (native dimensions; no trim/padding).
Preparation never activates assets or replaces runtime files.`;

function numeric(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!value.trim() || !Number.isFinite(Number(value)))
    throw new Error(`Invalid numeric argument: ${value}`);
  return Number(value);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      runtime: { type: 'boolean' },
      id: { type: 'string' },
      file: { type: 'string' },
      update: { type: 'boolean' },
      profile: { type: 'string' },
      provenance: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      padding: { type: 'string' },
      'display-width': { type: 'string' },
      'display-height': { type: 'string' },
      'render-scale': { type: 'string' },
      sampling: { type: 'string' },
      'trim-alpha': { type: 'string' },
      'pivot-x': { type: 'string' },
      'pivot-y': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  if (command === 'build' || (command === 'validate' && values.runtime)) {
    const allowed = command === 'build' ? [] : ['runtime'];
    if (positionals.length || Object.keys(values).some((key) => !allowed.includes(key)))
      throw new Error(usage);
    const root = process.cwd();
    console.log(
      JSON.stringify(
        command === 'build'
          ? await buildRuntime(root)
          : await withAssetLock(root, () => readRuntimeBuild(root)),
        null,
        2,
      ),
    );
    return;
  }
  if (values.runtime) throw new Error('--runtime is only supported by validate.');
  if (!['prepare', 'validate', 'preview'].includes(command) || !values.id || positionals.length)
    throw new Error(usage);
  if (command !== 'prepare' && Object.keys(values).some((key) => key !== 'id'))
    throw new Error(`${command} accepts only --id; it does not modify inputs.`);
  if (
    values.profile !== undefined &&
    values.profile !== 'static-png' &&
    values.profile !== 'pass-through'
  )
    throw new Error('Unknown profile; choose static-png or pass-through.');
  if (
    values.sampling !== undefined &&
    values.sampling !== 'nearest' &&
    values.sampling !== 'lanczos3'
  )
    throw new Error('Unknown sampling; choose nearest or lanczos3.');
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('Asset operation interrupted.'));
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const root = process.cwd();
    const candidate =
      command === 'prepare'
        ? await prepareAsset(root, {
            id: values.id,
            file: values.file,
            update: values.update,
            profile: values.profile,
            provenance: values.provenance,
            width: numeric(values.width),
            height: numeric(values.height),
            displayWidth: numeric(values['display-width']),
            displayHeight: numeric(values['display-height']),
            renderScale: numeric(values['render-scale']),
            padding: numeric(values.padding),
            sampling: values.sampling,
            trimAlpha: numeric(values['trim-alpha']),
            pivotX: numeric(values['pivot-x']),
            pivotY: numeric(values['pivot-y']),
            signal: controller.signal,
          })
        : await (command === 'validate' ? validateAsset : previewAsset)(
            root,
            values.id,
            controller.signal,
          );
    const { report } = candidate;
    console.log(
      JSON.stringify(
        {
          id: values.id,
          kind: report.kind,
          fingerprint: report.fingerprint,
          profile: candidate.recipe.profile,
          source: report.source,
          output: report.output,
          warnings: report.warnings,
          preview: resolve(root, candidate.directory, 'index.html'),
          report: resolve(root, candidate.directory, 'report.json'),
        },
        null,
        2,
      ),
    );
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

main().catch((error: unknown) => {
  console.error(
    `Asset operation failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
