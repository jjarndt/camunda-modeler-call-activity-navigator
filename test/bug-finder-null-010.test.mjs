/**
 * BUG-FINDER-NULL-010: findBestMatch gibt Location mit path='' zurueck
 *
 * In navigator-search.mjs findBestMatch() Zeile 140:
 *   const valid = locations.filter(loc => loc?.path);
 *
 * Die Filterung filtert Locations raus wo loc.path falsy ist (null, undefined, '').
 * Eine Location mit path='' wuerde NICHT im valid-Array sein.
 * Aber was wenn loc.path ein String ist der nur Whitespace enthaelt?
 * '   '.filter() => truthy! Der String '   ' ist truthy.
 *
 * Also: findBestMatch([{path: '   '}], '/current.bpmn') wuerde:
 * - '   ' besteht den filter
 * - parentDir('   ') = '   '.split().slice(0,-1).join('/') = ''
 * - normalizePath('   ', '/') = '' (getrimmt, leer)
 * - Kein Crash, aber gibt Location mit path='   ' zurueck
 *
 * Echter Verdacht: ProcessIndex.getLocations gibt locations mit echten
 * Leerzeichen-Pfaden zurueck? Nein, setFileIndex normalisiert immer.
 *
 * Echter neuer Verdacht: NavigatorSearch.indexFile -
 * wenn promise bereits existiert und wir dasselbe nochmal aufrufen,
 * koennte das zu einer Race-Condition fuehren wo der zweite await
 * NICHT die finally-Bereinigung ausfuehrt?
 *
 * In indexFile() Zeile 62-71:
 *   const existing = this._indexingPromises.get(normalized);
 *   if (existing) return existing;
 *   const promise = this._doIndexFile(filePath);
 *   this._indexingPromises.set(normalized, promise);
 *   try {
 *     await promise;
 *   } finally {
 *     this._indexingPromises.delete(normalized);
 *   }
 *
 * Wenn existing vorhanden, wird `return existing` aufgerufen - ohne eigenes try/finally.
 * Das ist korrekt fuer den zweiten Aufrufer (er wartet auf das existierende Promise).
 * Aber wenn der erste Aufrufer das Promise aus _indexingPromises loescht (finally),
 * und der dritte Aufrufer kommt nach dem Loeschen aber vor dem Resolve?
 * Nein, das ist sequentiell.
 *
 * Echter Verdacht: isCalledActivity() mit einem Element das $type ABER nicht type hat
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCallActivity } from '../client/bpmn-extension/util.mjs';

describe('BUG-FINDER-NULL-010: isCallActivity mit nicht-standardem Element', () => {
  it('isCallActivity gibt true zurueck fuer Element mit $type aber ohne type', () => {
    const element = { $type: 'bpmn:CallActivity' };
    assert.strictEqual(isCallActivity(element), true);
  });

  it('isCallActivity gibt false zurueck fuer Element mit weder type noch $type', () => {
    const element = {};
    assert.strictEqual(isCallActivity(element), false);
  });

  it('isCallActivity gibt false zurueck fuer Zahl', () => {
    assert.strictEqual(isCallActivity(42), false);
  });

  it('isCallActivity gibt false zurueck fuer String "bpmn:CallActivity"', () => {
    assert.strictEqual(isCallActivity('bpmn:CallActivity'), false);
  });

  it('isCallActivity gibt false zurueck fuer Array', () => {
    assert.strictEqual(isCallActivity([]), false);
  });
});
