/**
 * BUG-FINDER-NULL-006: extractIdFromTag Slow-Scan Limit falsch angewendet
 *
 * In bpmn-parser.mjs, Zeile 97:
 *   while (i < content.length && slowScan < MAX_SLOW_SCAN) {
 *
 * slowScan wird nur bei Zeile 127 inkrementiert:
 *   slowScan++;
 *
 * Das passiert NUR wenn kein bestimmter Charakter (Whitespace, >, /, ", ', 'i')
 * uebereinstimmt. Wenn der Content viele gueltige Chars hat (z.B. sehr lange
 * Attributnamen), wird i immer inkrementiert aber slowScan nicht immer.
 * Das koennte bei bestimmten Inputs zu langsamem Scan fuehren.
 *
 * Aber auch: NavigatorSearch.getLocations - was wenn processId ein Objekt ist?
 * In process-index.mjs Zeile 14:
 *   const key = (processId != null && typeof processId !== 'string') ? String(processId) : ...
 * Ein Objekt wie {} wird zu "[object Object]". Das ist zwar nicht null-crash,
 * aber semantisch falsch.
 *
 * Echter Test: extractProcessIds mit extrem grossem/malformed BPMN
 * - Ein <process tag ohne schliessenden > sollte kein crash verursachen
 * - Ein truncated attribute value sollte kein crash verursachen
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-FINDER-NULL-006: extractProcessIds mit truncated/malformed BPMN', () => {
  it('kein Crash bei process-Tag ohne schliessenden >', () => {
    const truncated = '<process id="myId" name="foo';
    assert.doesNotThrow(() => {
      extractProcessIds(truncated);
    }, 'extractProcessIds muss truncated BPMN sicher verarbeiten');
  });

  it('kein Crash bei process-Tag mit unclosed Attribut-Quote', () => {
    const malformed = '<bpmn:process id="unclosed-quote name="foo">';
    assert.doesNotThrow(() => {
      extractProcessIds(malformed);
    });
  });

  it('kein Crash bei leerem process-Tag Attributwert ohne Schluss-Quote', () => {
    const malformed = '<process id="';
    assert.doesNotThrow(() => {
      const result = extractProcessIds(malformed);
      // Kein Crash ist das Ziel, Ergebnis kann leer sein
      assert.ok(Array.isArray(result));
    });
  });

  it('process-Tag mit id-Attribut ohne Wert crasht nicht', () => {
    // id= ohne Wert (kein Anführungszeichen)
    const malformed = '<process id= name="foo">';
    assert.doesNotThrow(() => {
      const result = extractProcessIds(malformed);
      assert.ok(Array.isArray(result));
    });
  });
});
