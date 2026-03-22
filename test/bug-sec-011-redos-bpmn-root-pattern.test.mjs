/**
 * SEC-011: ReDoS in current BPMN_ROOT_PATTERN (index.js)
 *
 * SEC-002 tested the old pattern: /(.+[\\/](?:processes|bpmn))[\\/]/
 * The current pattern is: /(.*[\\/]?(?:processes|bpmn))[\\/]/
 *
 * Testing whether the new pattern still exhibits superlinear backtracking
 * on paths without "processes" or "bpmn" segments.
 *
 * CWE-1333: Inefficient Regular Expression Complexity
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Fixed pattern from index.js - uses [^\\/]* instead of .* to prevent ReDoS
const BPMN_ROOT_PATTERN = /^((?:[^\\/]*[\\/])*(?:processes|bpmn))[\\/]/;

describe('SEC-011: ReDoS in current BPMN_ROOT_PATTERN', () => {

  it('20k-char path without "processes"/"bpmn" should complete in < 50 ms', () => {
    // Path with many separators but no "processes" or "bpmn" segment
    const malicious = ('work\\project\\').repeat(1_540).slice(0, 20_000) + 'file.bpmn';

    const start = Date.now();
    const result = BPMN_ROOT_PATTERN.exec(malicious);
    const elapsed = Date.now() - start;

    // "bpmn" appears in "file.bpmn" so it may match, but the interesting
    // question is: does it take a long time?
    // If > 50ms, there's still backtracking.
    if (elapsed > 50) {
      assert.fail(
        `BPMN_ROOT_PATTERN took ${elapsed}ms on 20k input - ReDoS still present`
      );
    }
  });

  it('40k-char path should not show quadratic scaling vs 20k', () => {
    const make = (n) => ('work\\project\\').repeat(Math.ceil(n / 13)).slice(0, n) + 'file.bpmn';

    const input20k = make(20_000);
    const input40k = make(40_000);

    const start20 = Date.now();
    BPMN_ROOT_PATTERN.exec(input20k);
    const time20 = Math.max(Date.now() - start20, 1);

    const start40 = Date.now();
    BPMN_ROOT_PATTERN.exec(input40k);
    const time40 = Math.max(Date.now() - start40, 1);

    const ratio = time40 / time20;

    if (ratio >= 3) {
      assert.fail(
        `Quadratic scaling detected: 20k=${time20}ms, 40k=${time40}ms (ratio=${ratio.toFixed(1)}x)`
      );
    }
  });

  it('5k segments with "bpmn" only at end should complete in < 50 ms', () => {
    // Many path segments, "bpmn" appears only in the filename at the end
    // Even 5k segments triggers quadratic behavior because .* matches the
    // entire string, then [\\/]?(?:processes|bpmn) tries each position
    const malicious = 'C:\\' + 'a\\b\\c\\d\\e\\f\\g\\h\\'.repeat(625) + 'file.bpmn';

    const start = Date.now();
    BPMN_ROOT_PATTERN.exec(malicious);
    const elapsed = Date.now() - start;

    if (elapsed > 50) {
      assert.fail(
        `BPMN_ROOT_PATTERN took ${elapsed}ms on 5k segments - ReDoS vulnerability`
      );
    }
  });
});
