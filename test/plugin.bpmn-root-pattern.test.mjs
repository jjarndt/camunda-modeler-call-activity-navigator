import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// BPMN_ROOT_PATTERN tests
// ---------------------------------------------------------------------------

// The old vulnerable pattern (kept for regression/demonstration)
const OLD_PATTERN = /(.+[\\/](?:processes|bpmn))[\\/]/;

// The fixed pattern from index.js
const FIXED_PATTERN = /^((?:[^\\/]*[\\/])*(?:processes|bpmn))[\\/]/;

// The intermediate pattern (used in root-dir tests)
const INTERMEDIATE_PATTERN = /(.*[\\/]?(?:processes|bpmn))[\\/]/;

// ---------------------------------------------------------------------------
// Old pattern ReDoS demonstration
// ---------------------------------------------------------------------------

describe('BPMN_ROOT_PATTERN - old pattern ReDoS', () => {

  it('20k-char path takes > 100 ms (demonstrates O(n^2) backtracking)', () => {
    const malicious = ('work\\project\\').repeat(1_540).slice(0, 20_000) + 'file.bpmn';

    const start = Date.now();
    const result = OLD_PATTERN.exec(malicious);
    const elapsed = Date.now() - start;

    assert.equal(result, null, 'regex should not match');
    assert.ok(elapsed > 100,
      `Expected > 100 ms to demonstrate ReDoS, but took only ${elapsed} ms. ` +
      'If this fails, the regex was fixed.');
  });

  it('40k takes at least 3x longer than 20k (quadratic scaling)', () => {
    const input20k = ('work\\project\\').repeat(1_540).slice(0, 20_000) + 'file.bpmn';
    const input40k = ('work\\project\\').repeat(3_080).slice(0, 40_000) + 'file.bpmn';

    const start20 = Date.now();
    OLD_PATTERN.exec(input20k);
    const time20 = Date.now() - start20;

    const start40 = Date.now();
    OLD_PATTERN.exec(input40k);
    const time40 = Date.now() - start40;

    assert.ok(time40 >= time20 * 3,
      `Quadratic scaling not shown: 20k=${time20}ms, 40k=${time40}ms ` +
      `(ratio=${(time40 / time20).toFixed(1)}x, expected >= 3x). ` +
      'If this fails, the regex was fixed.');
  });
});

// ---------------------------------------------------------------------------
// Fixed pattern performance
// ---------------------------------------------------------------------------

describe('BPMN_ROOT_PATTERN - fixed pattern performance', () => {

  it('20k-char path completes in < 50 ms', () => {
    const malicious = ('work\\project\\').repeat(1_540).slice(0, 20_000) + 'file.bpmn';

    const start = Date.now();
    FIXED_PATTERN.exec(malicious);
    const elapsed = Date.now() - start;

    if (elapsed > 50) {
      assert.fail(`BPMN_ROOT_PATTERN took ${elapsed}ms on 20k input`);
    }
  });

  it('40k-char path does not show quadratic scaling vs 20k', () => {
    const make = (n) => ('work\\project\\').repeat(Math.ceil(n / 13)).slice(0, n) + 'file.bpmn';

    const input20k = make(20_000);
    const input40k = make(40_000);

    const start20 = Date.now();
    FIXED_PATTERN.exec(input20k);
    const time20 = Math.max(Date.now() - start20, 1);

    const start40 = Date.now();
    FIXED_PATTERN.exec(input40k);
    const time40 = Math.max(Date.now() - start40, 1);

    const ratio = time40 / time20;

    if (ratio >= 3) {
      assert.fail(
        `Quadratic scaling detected: 20k=${time20}ms, 40k=${time40}ms (ratio=${ratio.toFixed(1)}x)`);
    }
  });

  it('5k segments with "bpmn" only at end completes in < 50 ms', () => {
    const malicious = 'C:\\' + 'a\\b\\c\\d\\e\\f\\g\\h\\'.repeat(625) + 'file.bpmn';

    const start = Date.now();
    FIXED_PATTERN.exec(malicious);
    const elapsed = Date.now() - start;

    if (elapsed > 50) {
      assert.fail(`BPMN_ROOT_PATTERN took ${elapsed}ms on 5k segments`);
    }
  });
});

// ---------------------------------------------------------------------------
// Root-level directory matching
// ---------------------------------------------------------------------------

describe('BPMN_ROOT_PATTERN - root-level directory matching', () => {

  it('matches /processes/ at the root of an absolute path', () => {
    const path = '/processes/myprocess.bpmn';
    const match = path.match(INTERMEDIATE_PATTERN);
    assert.ok(match,
      `Pattern did not match "${path}". Sibling search will be skipped.`);
  });

  it('matches /bpmn/ at the root of an absolute path', () => {
    const path = '/bpmn/myprocess.bpmn';
    const match = path.match(INTERMEDIATE_PATTERN);
    assert.ok(match,
      `Pattern did not match "${path}". Sibling search will be skipped.`);
  });
});
