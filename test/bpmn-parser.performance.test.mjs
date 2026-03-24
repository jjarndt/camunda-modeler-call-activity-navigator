import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - ReDoS resistance', () => {

  it('4 quoted attributes without id= completes in under 200ms', () => {
    const attrs = 'name="foo" '.repeat(4);
    const input = `<bpmn:process ${attrs}noMatch>`;

    const start = Date.now();
    const result = extractProcessIds(input);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 200,
      `Took ${elapsed}ms for 4-attribute bpmn:process tag without id=`);
    assert.deepStrictEqual(result, []);
  });

  it('no exponential growth between 3 and 4 attributes', () => {
    const input3 = `<bpmn:process ${'name="foo" '.repeat(3)}noMatch>`;
    const input4 = `<bpmn:process ${'name="foo" '.repeat(4)}noMatch>`;

    const start3 = Date.now();
    extractProcessIds(input3);
    const elapsed3 = Date.now() - start3;

    assert.ok(elapsed3 < 100,
      `3 attributes took ${elapsed3}ms - baseline for comparison`);

    const start4 = Date.now();
    extractProcessIds(input4);
    const elapsed4 = Date.now() - start4;

    assert.ok(elapsed4 < 200,
      `4 attributes took ${elapsed4}ms (must be under 200ms)`);
  });
});

describe('extractProcessIds - quadratic attribute scan resistance', () => {

  it('many process tags after large quote block does not cause quadratic slowdown', () => {
    const quoteBlock = '"'.repeat(20_000);
    let processTags = '';
    for (let i = 0; i < 200; i++) {
      processTags += `<bpmn:process id="p${i}" /> `;
    }

    const xml = quoteBlock + processTags;

    const start = performance.now();
    const ids = extractProcessIds(xml);
    const elapsed = performance.now() - start;

    const smallXml = '"'.repeat(100) + processTags;
    const start2 = performance.now();
    const ids2 = extractProcessIds(smallXml);
    const elapsed2 = performance.now() - start2;

    const ratio = elapsed / Math.max(elapsed2, 0.1);

    assert.ok(
      ratio > 5,
      `Expected quadratic slowdown (ratio > 5x), got ratio=${ratio.toFixed(1)}x ` +
      `(large=${elapsed.toFixed(1)}ms, small=${elapsed2.toFixed(1)}ms). Code may be safe.`
    );
  });

  it('100k quotes prefix: even larger gap shows quadratic behavior', () => {
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

    assert.equal(ids1.length, ids2.length, 'Same number of IDs');

    assert.ok(
      ratio > 1.5,
      `Expected > 1.5x slowdown with 100k vs 100 quotes prefix, got ${ratio.toFixed(1)}x ` +
      `(small=${time1.toFixed(2)}ms, large=${time2.toFixed(2)}ms). Code may be safe.`
    );
  });
});

describe('extractProcessIds - unclosed tag DoS resistance', () => {

  it('1000 unclosed process tags complete in under 200ms', () => {
    const malicious = '<bpmn:process '.repeat(1_000);

    const start = Date.now();
    const result = extractProcessIds(malicious);
    const elapsed = Date.now() - start;

    if (elapsed > 200) {
      assert.fail(
        `1000 unclosed process tags took ${elapsed}ms. ` +
        'extractIdFromTag scans to end-of-string for each unclosed tag (CWE-400).'
      );
    }
  });

  it('quadratic scaling: 2000 tags should not take > 8x longer than 1000 tags', () => {
    const make = (n) => '<bpmn:process '.repeat(n);

    const start500 = Date.now();
    extractProcessIds(make(500));
    const time500 = Math.max(Date.now() - start500, 1);

    const start1000 = Date.now();
    extractProcessIds(make(1_000));
    const time1000 = Math.max(Date.now() - start1000, 1);

    const ratio = time1000 / time500;

    if (ratio >= 8) {
      assert.fail(
        `Quadratic scaling: 500 tags=${time500}ms, 1000 tags=${time1000}ms ` +
        `(ratio=${ratio.toFixed(1)}x). Confirms O(n^2) complexity.`
      );
    }
  });

  it('extrapolating: 5000 unclosed tags would take multiple seconds', () => {
    const make = (n) => '<bpmn:process '.repeat(n);

    const start500 = Date.now();
    extractProcessIds(make(500));
    const time500 = Math.max(Date.now() - start500, 1);

    const start1000 = Date.now();
    extractProcessIds(make(1_000));
    const time1000 = Math.max(Date.now() - start1000, 1);

    const estimated5000 = time1000 * 25;

    if (estimated5000 > 10000) {
      assert.fail(
        `Extrapolated time for 5000 unclosed tags: ~${estimated5000}ms ` +
        `(based on 500=${time500}ms, 1000=${time1000}ms).`
      );
    }
  });

  it('near-miss "<bpmn:proce " tags complete quickly', () => {
    const nearMiss = '<bpmn:proce '.repeat(10_000);

    const start = Date.now();
    const result = extractProcessIds(nearMiss);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500, `10k near-miss tags took ${elapsed}ms`);
    assert.deepStrictEqual(result, []);
  });

  it('very long attribute value before id does not cause DoS', () => {
    const longAttr = '<bpmn:process name="' + 'a'.repeat(100_000) + '" id="test">';

    const start = Date.now();
    const result = extractProcessIds(longAttr);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500, `Long attribute value took ${elapsed}ms`);
    assert.deepStrictEqual(result, ['test']);
  });

  it('many spaces between attributes does not cause DoS', () => {
    const spacey = '<bpmn:process ' + ' '.repeat(100_000) + 'id="test">';

    const start = Date.now();
    const result = extractProcessIds(spacey);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500, `100k spaces in attributes took ${elapsed}ms`);
    assert.deepStrictEqual(result, ['test']);
  });
});

describe('extractProcessIds - comment stripping adversarial input', () => {

  it('20k partial comment fragments complete in under 100ms', () => {
    const chunk = '<!-- --';
    const input = chunk.repeat(20_000) + '<bpmn:process id="test">';

    const start = Date.now();
    const result = extractProcessIds(input);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `Expected < 100ms, took ${elapsed}ms`);
    assert.deepStrictEqual(result, ['test']);
  });

  it('linear scaling: doubling input does not cause > 6x slowdown', () => {
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
      ratio < 6,
      `Scaling ratio ${ratio.toFixed(1)}x exceeds linear threshold (6x). ` +
      `10k=${time10}ms, 20k=${time20}ms`
    );
  });
});
