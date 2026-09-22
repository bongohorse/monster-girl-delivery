import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PerformanceEvidenceReport } from '../devtools/PerformanceEvidence';

interface EvidenceExportPlugin {
  share(options: Readonly<{ filename: string; content: string }>): Promise<Readonly<{ shared: boolean }>>;
}

const nativeEvidenceExport = registerPlugin<EvidenceExportPlugin>('EvidenceExport');

export type PerformanceEvidenceExportStatus =
  | 'browser-downloaded'
  | 'native-shared'
  | 'failed'
  | 'unavailable';

export interface PerformanceEvidenceExportResult {
  readonly status: PerformanceEvidenceExportStatus;
  readonly filename: string;
  readonly error?: string;
}

export const createPerformanceEvidenceFilename = (
  report: Readonly<PerformanceEvidenceReport>,
): string => {
  const preset = (report.context.performancePresetId ?? 'manual').replace(/[^a-z0-9-]+/gi, '-');
  const timestamp = report.capturedAtIso.replace(/[:.]/g, '-');
  const commit = report.build.commit.slice(0, 12);
  return `mgd-performance-${preset}-${commit}-${timestamp}.json`;
};

const downloadInBrowser = (filename: string, serialized: string): boolean => {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  const objectUrl = URL.createObjectURL(
    new Blob([serialized], { type: 'application/json;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body?.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return true;
};

export const exportPerformanceEvidence = async (
  report: Readonly<PerformanceEvidenceReport>,
  serialized: string,
): Promise<Readonly<PerformanceEvidenceExportResult>> => {
  const filename = createPerformanceEvidenceFilename(report);

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await nativeEvidenceExport.share({ filename, content: serialized });
      return Object.freeze({
        status: result.shared ? 'native-shared' : 'failed',
        filename,
        ...(result.shared ? {} : { error: 'Native share sheet did not open.' }),
      });
    } catch (error) {
      return Object.freeze({
        status: 'failed',
        filename,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return Object.freeze({
    status: downloadInBrowser(filename, serialized) ? 'browser-downloaded' : 'unavailable',
    filename,
  });
};
