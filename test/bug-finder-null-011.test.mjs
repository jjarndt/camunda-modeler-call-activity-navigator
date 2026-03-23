/**
 * BUG-FINDER-NULL-011: isSafeUrl mit nicht-String Inputs
 *
 * In update-check.mjs, isSafeUrl() Zeile 34-43:
 *   export function isSafeUrl(url) {
 *     try {
 *       const parsed = new URL(url);
 *       ...
 *     } catch {
 *       return false;
 *     }
 *   }
 *
 * new URL(null) wirft TypeError: Failed to construct 'URL': Invalid URL
 * new URL(undefined) wirft TypeError
 * new URL(123) wirft TypeError
 * Der try/catch faengt diese ab. Kein Crash erwartet.
 *
 * ProcessIndex - testen ob processId '' korrekt behandelt wird:
 * setFileIndex('/file.bpmn', ['']) - '' wird durch filter(Boolean) entfernt,
 * also kein leerer processId im Index. Korrekt.
 *
 * Echter neuer Verdacht: NavigatorSearch.searchInKnownFiles
 * wenn processId null ist:
 * Zeile 98: if (typeof processId === 'string') processId = processId.trim();
 * Bei processId = null: typeof null !== 'string', also bleibt processId = null.
 * Dann Zeile 113: this.getLocations(null)
 * In process-index.mjs getLocations(null):
 *   const key = (null != null && ...) => false => typeof null === 'string' => false => key = null
 *   Map.get(null) => undefined => (undefined || []).map() => []
 * Das ist sicher. Aber was kommt zurueck?
 * allLocations = [] => locations = [] => return null
 *
 * Echter echter Verdacht: getCalledProcessId() wenn processId ein Getter ist
 * der beim Zugriff eine Exception wirft.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeUrl } from '../client/update-check.mjs';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-011: Verschiedene NULL-SAFETY Checks', () => {
  it('isSafeUrl(null) gibt false zurueck ohne Crash', () => {
    assert.doesNotThrow(() => {
      const result = isSafeUrl(null);
      assert.strictEqual(result, false);
    });
  });

  it('isSafeUrl(undefined) gibt false zurueck ohne Crash', () => {
    assert.doesNotThrow(() => {
      const result = isSafeUrl(undefined);
      assert.strictEqual(result, false);
    });
  });

  it('isSafeUrl(42) gibt false zurueck ohne Crash', () => {
    assert.doesNotThrow(() => {
      const result = isSafeUrl(42);
      assert.strictEqual(result, false);
    });
  });

  it('searchInKnownFiles mit null processId crasht nicht', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index
    });
    await assert.doesNotReject(
      async () => search.searchInKnownFiles(null, '/file.bpmn', new Set(['/other.bpmn'])),
      'searchInKnownFiles(null processId) darf nicht crashen'
    );
  });
});
