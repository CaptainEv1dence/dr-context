import { describe, expect, test } from 'vitest';
import { applySuppressions, fingerprintFinding } from '../src/core/suppressions.js';
import type { Finding } from '../src/core/types.js';

const finding: Finding = {
  id: 'missing-verification-command',
  title: 'Verification script is not mentioned in agent instructions',
  category: 'verification',
  severity: 'warning',
  confidence: 'high',
  primarySource: { file: 'package.json', line: 12, text: '"lint":"eslint ."' },
  evidence: [],
  suggestion: 'Add lint to AGENTS.md.'
};

describe('finding suppressions', () => {
  test('fingerprints use sha256 hex format', () => {
    expect(fingerprintFinding(finding)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test('fingerprints do not include source text', () => {
    const first = fingerprintFinding(finding);
    const second = fingerprintFinding({ ...finding, primarySource: { ...finding.primarySource!, text: 'changed' } });

    expect(second).toBe(first);
  });

  test('suppresses by id and file', () => {
    const result = applySuppressions([finding], [
      { id: 'missing-verification-command', file: 'package.json', reason: 'accepted' }
    ]);

    expect(result.findings).toEqual([]);
    expect(result.suppressedFindings).toHaveLength(1);
    expect(result.suppressedFindings[0].suppression.reason).toBe('accepted');
  });

  test('suppresses by id and fingerprint', () => {
    const fingerprint = fingerprintFinding(finding);
    const result = applySuppressions([finding], [{ id: 'missing-verification-command', fingerprint }]);

    expect(result.findings).toEqual([]);
    expect(result.suppressedFindings).toHaveLength(1);
    expect(result.suppressedFindings[0].fingerprint).toBe(fingerprint);
  });

  test('does not suppress a different id or file', () => {
    const result = applySuppressions([finding], [{ id: 'ci-doc-command-mismatch', file: 'AGENTS.md' }]);

    expect(result.findings).toEqual([finding]);
    expect(result.suppressedFindings).toEqual([]);
  });
});
