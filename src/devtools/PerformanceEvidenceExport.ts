import type { PerformanceEvidenceReport } from './PerformanceEvidence';

export const PERFORMANCE_EVIDENCE_JSON_MIME_TYPE = 'application/json;charset=utf-8';

export const createPerformanceEvidenceFilename = (
  report: Readonly<PerformanceEvidenceReport>,
): string => {
  const preset = (report.context.performancePresetId ?? 'manual').replace(/[^a-z0-9-]+/gi, '-');
  const timestamp = report.capturedAtIso.replace(/[:.]/g, '-');
  const commit = report.build.commit.slice(0, 12);
  return `mgd-performance-${preset}-${commit}-${timestamp}.json`;
};

/**
 * Preserve the existing browser/PWA download path while allowing the native transport to be
 * selected separately. Returns false when the browser cannot provide a download surface.
 */
export const downloadPerformanceEvidenceInBrowser = (
  report: Readonly<PerformanceEvidenceReport>,
  serialized: string,
): boolean => {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  const objectUrl = URL.createObjectURL(
    new Blob([serialized], { type: PERFORMANCE_EVIDENCE_JSON_MIME_TYPE }),
  );
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = createPerformanceEvidenceFilename(report);
  anchor.hidden = true;
  document.body?.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return true;
};
