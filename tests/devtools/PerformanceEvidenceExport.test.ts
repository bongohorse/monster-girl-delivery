import { describe, expect, it } from 'vitest';
import type { PerformanceEvidenceReport } from '../../src/devtools/PerformanceEvidence';
import {
  createPerformanceEvidenceFilename,
  downloadPerformanceEvidenceInBrowser,
} from '../../src/devtools/PerformanceEvidenceExport';

const createReportIdentity = (
  performancePresetId: string | null = 'zapper heavy/v1',
): Readonly<PerformanceEvidenceReport> =>
  ({
    build: { commit: 'abc123def4567890', mode: 'development' },
    capturedAtIso: '2026-09-22T18:12:34.567Z',
    context: { performancePresetId },
  }) as Readonly<PerformanceEvidenceReport>;

describe('PerformanceEvidenceExport', () => {
  it('creates a stable, filesystem-safe evidence filename', () => {
    expect(createPerformanceEvidenceFilename(createReportIdentity())).toBe(
      'mgd-performance-zapper-heavy-v1-abc123def456-2026-09-22T18-12-34-567Z.json',
    );
    expect(createPerformanceEvidenceFilename(createReportIdentity(null))).toContain(
      'mgd-performance-manual-',
    );
  });

  it('reports the browser download surface as unavailable outside a browser', () => {
    expect(downloadPerformanceEvidenceInBrowser(createReportIdentity(), '{"schemaVersion":6}')).toBe(
      false,
    );
  });
});
