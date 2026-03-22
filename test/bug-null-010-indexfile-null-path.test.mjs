/**
 * BUG-NULL-010 Hypothesis: NavigatorSearch.indexFile(null) calls
 * this._fileSystem.readFile(null) without guarding against a null/undefined
 * filePath. If the fileSystem.readFile resolves normally (returns null/undefined),
 * setFileIndex is then called with null, which normalizePath turns into ''.
 * The setFileIndex guard (!filePath || !filePath.trim()) catches the empty string,
 * so no crash there - but the whole flow can also be triggered from
 * searchInKnownFiles when a Set contains null elements, because
 * [...(knownFiles ?? [])].filter(f => normalizePath(f, '/') !== normalizedCurrent)
 * evaluates normalizePath(null, '/') = '' which is != normalizedCurrent,
 * so the null element passes the filter and indexFile(null) is invoked.
 *
 * The bug: indexFile(null) should guard early and not call fileSystem.readFile(null).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-NULL-010: indexFile called with null path', () => {

  it('indexFile(null) should not call fileSystem.readFile', async () => {
    let readFileCalled = false;
    const fileSystem = {
      readFile: async (path) => {
        readFileCalled = true;
        return { contents: '' };
      }
    };

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    // indexFile with null should return early without calling readFile
    await assert.doesNotThrow(async () => {
      await search.indexFile(null);
    });

    assert.strictEqual(
      readFileCalled,
      false,
      'indexFile(null) must NOT call fileSystem.readFile - null is not a valid path'
    );
  });

  it('searchInKnownFiles with null element in knownFiles Set must not call indexFile(null)', async () => {
    let readFileCalledWithNull = false;
    const fileSystem = {
      readFile: async (path) => {
        if (path === null || path === undefined || path === '') {
          readFileCalledWithNull = true;
        }
        return { contents: '' };
      }
    };

    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    // A Set containing a null element - could happen if upstream code is careless
    const knownFiles = new Set([null, '/some/other/file.bpmn']);

    await search.searchInKnownFiles('Process_1', '/current/file.bpmn', knownFiles);

    assert.strictEqual(
      readFileCalledWithNull,
      false,
      'searchInKnownFiles must skip null/undefined/empty elements in knownFiles'
    );
  });
});
