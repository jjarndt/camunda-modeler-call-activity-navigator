/**
 * SEC-014: Quadratic complexity in isInsideAttributeValue (bpmn-parser.mjs)
 *
 * isInsideAttributeValue scans backwards from matchIndex to determine
 * if the match is inside a quoted attribute value.
 * For each <bpmn:process match, it scans back to the nearest < or >.
 *
 * If there are many <bpmn:process matches, each one scans back through
 * all preceding content, leading to O(n * m) complexity where n is the
 * number of matches and m is the average distance to the enclosing tag.
 *
 * Worst case: many <bpmn:process tags preceded by a large block of quotes.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('SEC-014: Quadratic isInsideAttributeValue in bpmn-parser', () => {

  it('many process tags after large quote block causes O(n*m) scanning', () => {
    // Create a large block that doesn't contain < or > to maximize backward scan
    // Then place many <bpmn:process tags after it
    // isInsideAttributeValue will scan back through the entire quote block for EACH tag
    const quoteBlock = '"'.repeat(20_000);
    let processTags = '';
    for (let i = 0; i < 200; i++) {
      processTags += `<bpmn:process id="p${i}" /> `;
    }

    const xml = quoteBlock + processTags;

    const start = performance.now();
    const ids = extractProcessIds(xml);
    const elapsed = performance.now() - start;

    // Each of the 200 process tags causes isInsideAttributeValue to scan back
    // through up to 20k characters of quotes. Total: ~200 * 20k = 4M operations.
    // Compare with a version where the quote block is small:
    const smallXml = '"'.repeat(100) + processTags;
    const start2 = performance.now();
    const ids2 = extractProcessIds(smallXml);
    const elapsed2 = performance.now() - start2;

    // If quadratic, the large version should be significantly slower
    const ratio = elapsed / Math.max(elapsed2, 0.1);

    // We assert the bug exists if ratio > 5
    assert.ok(
      ratio > 5,
      `Expected quadratic slowdown (ratio > 5x), got ratio=${ratio.toFixed(1)}x ` +
      `(large=${elapsed.toFixed(1)}ms, small=${elapsed2.toFixed(1)}ms). Code may be safe.`
    );
  });

  it('ratio test with 100k quotes: even larger gap shows quadratic behavior', () => {
    // Scale up to make the ratio even more obvious
    const largeQuotes = '"'.repeat(100_000);
    const smallQuotes = '"'.repeat(100);
    let processTags = '';
    for (let i = 0; i < 200; i++) {
      processTags += `<bpmn:process id="q${i}" /> `;
    }

    const largeXml = largeQuotes + processTags;
    const smallXml = smallQuotes + processTags;

    const start1 = performance.now();
    const ids1 = extractProcessIds(smallXml);
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    const ids2 = extractProcessIds(largeXml);
    const time2 = performance.now() - start2;

    const ratio = time2 / Math.max(time1, 0.01);

    // Both should find the same IDs
    assert.equal(ids1.length, ids2.length, 'Same number of IDs');

    // With 100k quotes prefix, each backward scan is ~1000x longer
    // so overall time should be significantly higher
    assert.ok(
      ratio > 1.5,
      `Expected > 1.5x slowdown with 100k vs 100 quotes prefix, got ${ratio.toFixed(1)}x ` +
      `(small=${time1.toFixed(2)}ms, large=${time2.toFixed(2)}ms). Code may be safe.`
    );
  });
});
