/**
 * SEC-006: Verify comment stripping handles adversarial input efficiently.
 *
 * Previously, the regex /<!--[\s\S]*?-->/g caused quadratic backtracking
 * with many partial comment sequences. Now uses iterative parser.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('SEC-006: comment stripping handles adversarial input efficiently', () => {

  it('20k partial comment fragments complete in < 100 ms', () => {
    const chunk = '<!-- --';
    const input = chunk.repeat(20_000) + '<bpmn:process id="test">';

    const start = Date.now();
    const result = extractProcessIds(input);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `Expected < 100 ms, took ${elapsed} ms`);
    assert.deepEqual(result, ['test']);
  });

  it('linear scaling: doubling input does not cause > 3x slowdown', () => {
    const chunk = '<!-- --';
    const input10k = chunk.repeat(10_000) + '<bpmn:process id="test">';
    const input20k = chunk.repeat(20_000) + '<bpmn:process id="test">';

    const start10 = Date.now();
    extractProcessIds(input10k);
    const time10 = Math.max(Date.now() - start10, 1);

    const start20 = Date.now();
    extractProcessIds(input20k);
    const time20 = Math.max(Date.now() - start20, 1);

    const ratio = time20 / time10;

    assert.ok(
      ratio < 3,
      `Scaling ratio ${ratio.toFixed(1)}x exceeds linear threshold (3x). ` +
      `10k=${time10}ms, 20k=${time20}ms`
    );
  });
});
