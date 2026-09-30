import { exportCiPreviews } from './AssetCiPreviews';

exportCiPreviews(process.cwd(), { summaryPath: process.env.GITHUB_STEP_SUMMARY })
  .then((report) => console.log(JSON.stringify(report, null, 2)))
  .catch((error: unknown) => {
    console.error(
      `CI preview export failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
