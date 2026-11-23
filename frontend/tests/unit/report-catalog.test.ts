import { describe, expect, it } from 'vitest';
import { reportCatalog, reportCount } from '../../src/features/reports/catalog';

describe('reports reference catalog', () => {
  it('contains the declared 28 reports across the six reference categories', () => {
    expect(reportCatalog.map((category) => category.reports.length)).toEqual([6, 4, 5, 5, 4, 4]);
    expect(reportCount).toBe(28);
  });

  it('defines purpose, filters, outputs, permissions, and a live report route for each item', () => {
    for (const report of reportCatalog.flatMap((category) => category.reports)) {
      expect(report.purpose.trim()).not.toBe('');
      expect(report.filters.length).toBeGreaterThan(0);
      expect(report.outputs.length).toBeGreaterThan(0);
      expect(report.permissions.length).toBeGreaterThan(0);
      expect(report.path).toMatch(/^\/(reports|finance)\//);
    }
  });
});
