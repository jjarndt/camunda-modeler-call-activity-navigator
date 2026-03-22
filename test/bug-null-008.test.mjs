/**
 * BUG-NULL-008 Hypothesis: getProcessIdsFromFile has a blank catch {} that
 * swallows ALL errors including TypeError, while indexFile explicitly re-throws
 * TypeError. This inconsistency means programming errors (like a broken
 * fileSystem object) are silently hidden in getProcessIdsFromFile but correctly
 * surfaced in indexFile.
 *
 * navigator-search.mjs indexFile:
 *   catch (err) {
 *     if (err instanceof TypeError) throw err;  // re-throws programming errors
 *     this._index.setFileIndex(filePath, []);
 *   }
 *
 * navigator-search.mjs getProcessIdsFromFile:
 *   catch {
 *     return [];  // swallows EVERYTHING, including TypeError
 *   }
 *
 * The test proves the bug by asserting that getProcessIdsFromFile should
 * re-throw TypeError (consistent with indexFile), but instead returns [].
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

function makeBrokenFileSystem() {
  // readFile is not a function -> calling it throws TypeError
  return { readFile: null };
}

describe('BUG-NULL-008: getProcessIdsFromFile swallows TypeError (inconsistent with indexFile)', () => {
  it('indexFile re-throws TypeError when fileSystem.readFile is not callable', async () => {
    const search = new NavigatorSearch({
      fileSystem: makeBrokenFileSystem(),
      index: new ProcessIndex()
    });

    // This should throw - and does
    await assert.rejects(
      () => search.indexFile('/test.bpmn'),
      TypeError,
      'indexFile must re-throw TypeError from broken fileSystem'
    );
  });

  it('getProcessIdsFromFile should re-throw TypeError but instead silently returns []', async () => {
    const search = new NavigatorSearch({
      fileSystem: makeBrokenFileSystem(),
      index: new ProcessIndex()
    });

    // BUG: should reject with TypeError (consistent with indexFile), but resolves with []
    // This test FAILS because the code has the bug: catch {} swallows TypeError
    await assert.rejects(
      () => search.getProcessIdsFromFile('/test.bpmn'),
      TypeError,
      'getProcessIdsFromFile should re-throw TypeError just like indexFile does'
    );
  });
});
