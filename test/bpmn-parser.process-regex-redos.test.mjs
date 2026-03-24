/**
 * SEC-004: ReDoS in bpmn-parser.mjs process extraction regex
 *
 * The regex in extractProcessIds:
 *   /<bpmn2?:process[\s>](?:[^"'>]*|"[^"]*"|'[^']*')*?\bid=["']([^"']+)["']/g
 *
 * Catastrophic backtracking: The outer *? (lazy) and inner [^"'>]* (greedy)
 * create exponential complexity. Even 20 space-separated tokens (~40 chars)
 * after <bpmn:process takes multiple seconds. 25 tokens hangs > 30 seconds.
 *
 * CWE-1333: Inefficient Regular Expression Complexity
 * Severity: High
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const PROCESS_REGEX = /<bpmn2?:process[\s>](?:[^"'>]*|"[^"]*"|'[^']*')*?\bid=["']([^"']+)["']/g;

describe('SEC-004: ReDoS in bpmn-parser.mjs process regex', () => {

  it('15 tokens takes > 50 ms (should be < 1 ms for 30 chars)', () => {
    const malicious = '<bpmn:process ' + 'a '.repeat(15);

    const start = Date.now();
    PROCESS_REGEX.lastIndex = 0;
    PROCESS_REGEX.exec(malicious);
    const elapsed = Date.now() - start;

    assert.ok(
      elapsed > 50,
      `Expected > 50 ms for 15 tokens, but took only ${elapsed} ms. Regex may be fixed.`
    );
  });

  it('exponential scaling: n+3 tokens takes > 5x longer than n tokens', () => {
    const makeInput = (n) => '<bpmn:process ' + 'a '.repeat(n);

    // Warmup
    PROCESS_REGEX.lastIndex = 0;
    PROCESS_REGEX.exec(makeInput(10));

    const input13 = makeInput(13);
    const start13 = Date.now();
    PROCESS_REGEX.lastIndex = 0;
    PROCESS_REGEX.exec(input13);
    const time13 = Date.now() - start13;

    const input16 = makeInput(16);
    const start16 = Date.now();
    PROCESS_REGEX.lastIndex = 0;
    PROCESS_REGEX.exec(input16);
    const time16 = Date.now() - start16;

    // Exponential: 3 more tokens -> ~8x slower (2^3)
    // Use 5x as threshold to be conservative
    const ratio = time13 > 0 ? time16 / time13 : Infinity;

    assert.ok(
      ratio >= 5,
      `Exponential scaling not shown: n=13: ${time13}ms, n=16: ${time16}ms ` +
      `(ratio=${ratio.toFixed(1)}x, expected >= 5x). Regex may be fixed.`
    );
  });
});
