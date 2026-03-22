/**
 * SEC-NEW-004: DoS via unclosed process tags in bpmn-parser.mjs
 *
 * extractIdFromTag scans character-by-character from the start of
 * attributes to find id="...". If the tag never closes (no ">" found),
 * it scans to the end of the entire string. When PROCESS_TAG_RE matches
 * many unclosed <bpmn:process tags, extractIdFromTag is called for EACH
 * match and scans the remaining string each time. This creates O(n*m)
 * behavior where n = number of matches and m = string length.
 *
 * With 5000 unclosed process tags (70k chars), this causes multi-second
 * hangs. With 50k tags, it effectively freezes the parser.
 *
 * CWE-400: Uncontrolled Resource Consumption
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('SEC-NEW-004: DoS via unclosed process tags in BPMN parser', () => {

  it('1000 unclosed process tags should complete in < 200ms but takes longer', () => {
    // 1000 unclosed process tags: each one causes extractIdFromTag to scan
    // from its position to the end of the string
    const malicious = '<bpmn:process '.repeat(1_000);

    const start = Date.now();
    const result = extractProcessIds(malicious);
    const elapsed = Date.now() - start;

    // With O(n*m) behavior, 1000 tags * 14k chars = ~14M operations
    // This should take > 200ms due to quadratic behavior
    if (elapsed > 200) {
      assert.fail(
        `1000 unclosed process tags took ${elapsed}ms. ` +
        'extractIdFromTag scans to end-of-string for each unclosed tag, ' +
        'causing O(n*m) complexity. A BPMN file with many unclosed tags ' +
        'freezes the parser (CWE-400).'
      );
    }
  });

  it('quadratic scaling: 2000 tags takes > 3x longer than 1000 tags', () => {
    const make = (n) => '<bpmn:process '.repeat(n);

    const input500 = make(500);
    const input1000 = make(1_000);

    const start500 = Date.now();
    extractProcessIds(input500);
    const time500 = Math.max(Date.now() - start500, 1);

    const start1000 = Date.now();
    extractProcessIds(input1000);
    const time1000 = Math.max(Date.now() - start1000, 1);

    const ratio = time1000 / time500;

    // O(n^2): doubling input should ~4x time
    // Use 3x as conservative threshold
    if (ratio >= 3) {
      assert.fail(
        `Quadratic scaling: 500 tags=${time500}ms, 1000 tags=${time1000}ms ` +
        `(ratio=${ratio.toFixed(1)}x). Doubling unclosed tags causes >3x slowdown, ` +
        'confirming O(n^2) complexity in extractIdFromTag.'
      );
    }
  });

  it('extrapolating: 5000 unclosed tags would take multiple seconds', () => {
    // Measure 500 and 1000, then extrapolate to 5000
    const make = (n) => '<bpmn:process '.repeat(n);

    const start500 = Date.now();
    extractProcessIds(make(500));
    const time500 = Math.max(Date.now() - start500, 1);

    const start1000 = Date.now();
    extractProcessIds(make(1_000));
    const time1000 = Math.max(Date.now() - start1000, 1);

    // With O(n^2), time for 5000 = time1000 * (5000/1000)^2 = time1000 * 25
    const estimated5000 = time1000 * 25;

    if (estimated5000 > 1000) {
      assert.fail(
        `Extrapolated time for 5000 unclosed tags: ~${estimated5000}ms ` +
        `(based on 500=${time500}ms, 1000=${time1000}ms). ` +
        'A BPMN file with many unclosed process tags can freeze the Modeler UI.'
      );
    }
  });

  it('many near-miss "<bpmn:proce " (almost matching) completes quickly', () => {
    // Near-misses don't match PROCESS_TAG_RE, so no extractIdFromTag calls
    const nearMiss = '<bpmn:proce '.repeat(10_000);

    const start = Date.now();
    const result = extractProcessIds(nearMiss);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500,
      `10k near-miss tags took ${elapsed}ms`);
    assert.deepStrictEqual(result, []);
  });

  it('very long attribute value before id should not cause DoS', () => {
    const longAttr = '<bpmn:process name="' + 'a'.repeat(100_000) + '" id="test">';

    const start = Date.now();
    const result = extractProcessIds(longAttr);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500,
      `Long attribute value took ${elapsed}ms`);
    assert.deepStrictEqual(result, ['test']);
  });

  it('many spaces between attributes should not cause DoS', () => {
    const spacey = '<bpmn:process ' + ' '.repeat(100_000) + 'id="test">';

    const start = Date.now();
    const result = extractProcessIds(spacey);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500,
      `100k spaces in attributes took ${elapsed}ms`);
    assert.deepStrictEqual(result, ['test']);
  });
});
