/**
 * SEC-002: ReDoS in BPMN_ROOT_PATTERN (index.js line 15)
 *
 * The pattern /(.+[\\/](?:processes|bpmn))[\\/]/ uses .+ (greedy, matches
 * any character including path separators) combined with the literal
 * separator [\\/] inside a capturing group. When the path contains no
 * "processes" or "bpmn" directory component, the regex engine must try
 * every possible split of the path into (.+)([\\/]) substrings, producing
 * O(n^2) backtracking on the number of separator characters in the path.
 *
 * Measured scaling (backslash paths, no match):
 *   n= 5 000 chars -> ~14 ms
 *   n=10 000 chars -> ~62 ms  (2x input -> ~4x time)
 *   n=20 000 chars -> ~241 ms (4x input -> ~17x time)
 *   n=40 000 chars -> ~861 ms (8x input -> ~60x time)
 *
 * Attack vector: A user opens a .bpmn file from a deeply-nested directory
 * whose full path does not contain a "processes" or "bpmn" segment. The
 * plugin's _doHandleOpenProcess calls:
 *
 *   currentFilePath.match(BPMN_ROOT_PATTERN)
 *
 * where currentFilePath is the user-controlled file path. A path of
 * ~40 000 characters freezes the Camunda Modeler UI thread for ~1 second.
 * Paths of this length can appear on network shares or deeply-nested
 * project structures, and are also trivially crafted by an attacker who
 * tricks a user into opening a specially-named file.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BPMN_ROOT_PATTERN = /(.+[\\/](?:processes|bpmn))[\\/]/;

describe('SEC-002: ReDoS in BPMN_ROOT_PATTERN (index.js line 15)', () => {

  it('demonstrates O(n^2) growth: 20k-char path takes > 100 ms (expected linear < 5 ms)', () => {
    // ~20 000 chars of repeated backslash segments with no "processes"/"bpmn"
    const malicious = ('work\\project\\').repeat(1_540).slice(0, 20_000) + 'file.bpmn';

    const start = Date.now();
    const result = BPMN_ROOT_PATTERN.exec(malicious);
    const elapsed = Date.now() - start;

    assert.equal(result, null, 'regex should not match');

    // A linear regex would finish in < 5 ms. > 100 ms proves superlinear backtracking.
    assert.ok(
      elapsed > 100,
      `Expected > 100 ms to demonstrate ReDoS, but took only ${elapsed} ms. ` +
      'If this fails, the regex was fixed.'
    );
  });

  it('demonstrates quadratic scaling: 40k takes at least 3x longer than 20k', () => {
    const input20k = ('work\\project\\').repeat(1_540).slice(0, 20_000) + 'file.bpmn';
    const input40k = ('work\\project\\').repeat(3_080).slice(0, 40_000) + 'file.bpmn';

    const start20 = Date.now();
    BPMN_ROOT_PATTERN.exec(input20k);
    const time20 = Date.now() - start20;

    const start40 = Date.now();
    BPMN_ROOT_PATTERN.exec(input40k);
    const time40 = Date.now() - start40;

    // O(n^2): doubling input should ~quadruple time.
    // We use a conservative threshold of 3x to account for variance.
    assert.ok(
      time40 >= time20 * 3,
      `Quadratic scaling not shown: 20k=${time20}ms, 40k=${time40}ms ` +
      `(ratio=${(time40 / time20).toFixed(1)}x, expected >= 3x). ` +
      'If this fails, the regex was fixed.'
    );
  });

});
