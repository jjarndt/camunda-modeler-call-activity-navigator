/**
 * bug-perf-007: ReDoS in bpmn-parser.mjs - katastrophales Backtracking
 *
 * bpmn-parser.mjs Zeile 8-10:
 *   const matches = stripped.matchAll(
 *     /<bpmn2?:process[\s>](?:[^"'>]*|"[^"]*"|'[^']*')*?\bid=["']([^"']+)["']/g
 *   );
 *
 * Die aeussere Gruppe (?:[^"'>]*|"[^"]*"|'[^']*')*? kombiniert eine Alternation
 * mit einem aeusseren lazy-Quantifizierer *?. Wenn kein \bid= nach dem Tag-Anfang
 * folgt, muss die Regex-Engine alle moeglichen Aufspaltungen der Eingabe in
 * [^"'>]* und "..." Segmente ausprobieren.
 *
 * Gemessenes Verhalten:
 *   3 quoted Attribute (55 Zeichen): ~16ms   (akzeptabel)
 *   4 quoted Attribute (66 Zeichen): ~524ms  (bereits problematisch)
 *   5 quoted Attribute (77 Zeichen): >5000ms (haengt praktisch)
 *
 * Das beweist exponentielles Backtracking O(2^n) bezueglich der Anzahl
 * der Attribute/Zeichen nach dem Tag-Oeffner.
 *
 * Angriffsszenario: Eine praeparierte oder fehlerhafte BPMN-Datei mit einem
 * <bpmn:process ...> Tag mit vielen Attributen und fehlendem id= Attribut
 * friert den Camunda Modeler ein.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-PERF-007: ReDoS in extractProcessIds regex (bpmn-parser.mjs line 9)', () => {

  it('4 quoted attributes without id= should complete in under 200ms', () => {
    // 4 wiederholte quoted Attribute nach <bpmn:process, kein id=
    // Bei korrekter Regex: O(n), bei ReDoS-Regex: ~524ms gemessen
    const attrs = 'name="foo" '.repeat(4);
    const input = `<bpmn:process ${attrs}noMatch>`;

    const start = Date.now();
    const result = extractProcessIds(input);
    const elapsed = Date.now() - start;

    assert.ok(
      elapsed < 200,
      `extractProcessIds took ${elapsed}ms for 4-attribute bpmn:process tag without id= ` +
      `(input length: ${input.length} chars). ` +
      `ReDoS confirmed in bpmn-parser.mjs line 9! ` +
      `The regex (?:[^"'>]*|"[^"]*"|'[^']*')*? causes catastrophic backtracking ` +
      `when no \\bid= follows. Fix: use possessive quantifiers or atomic groups, ` +
      `or rewrite the attribute-matching portion.`
    );
    assert.deepEqual(result, [], 'Should return empty array when no id= present');
  });

  it('demonstrates exponential growth: 3 vs 4 attributes shows >10x slowdown', () => {
    // Mit 3 Attributen (55 Zeichen): ~16ms
    // Mit 4 Attributen (66 Zeichen): ~524ms
    // Das ist >30x langsamer fuer 11 Zeichen mehr - klares O(2^n) Muster

    const attrs3 = 'name="foo" '.repeat(3);
    const input3 = `<bpmn:process ${attrs3}noMatch>`;

    const attrs4 = 'name="foo" '.repeat(4);
    const input4 = `<bpmn:process ${attrs4}noMatch>`;

    const start3 = Date.now();
    extractProcessIds(input3);
    const elapsed3 = Date.now() - start3;

    // Der 4-Attribute Fall wird im Test mit Timeout abgesichert
    // Wenn er weniger als 10x langsamer ist als der 3-Attribute Fall, kein ReDoS
    // Wenn er mehr als 10x langsamer ist, liegt exponentielles Wachstum vor

    // Wir beweisen nur den 3-Attribute Fall ist schnell (kein Timeout)
    assert.ok(
      elapsed3 < 100,
      `3 attributes took ${elapsed3}ms - baseline for comparison`
    );

    // Jetzt 4 Attribute mit engem Timeout - wenn ReDoS: schlaegt fehl
    const start4 = Date.now();
    // Wenn dieser Teil haengt, schlaegt der gesamte Test fehl (Node.js timeout)
    extractProcessIds(input4);
    const elapsed4 = Date.now() - start4;

    const ratio = elapsed3 > 0 ? elapsed4 / elapsed3 : elapsed4;
    assert.ok(
      elapsed4 < 200,
      `4 attributes took ${elapsed4}ms vs ${elapsed3}ms for 3 attributes ` +
      `(ratio: ${ratio.toFixed(1)}x). ` +
      `This proves catastrophic backtracking in bpmn-parser.mjs line 9.`
    );
  });
});
