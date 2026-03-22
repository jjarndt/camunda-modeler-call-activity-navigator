/**
 * BUG-NULL-011 Hypothesis: NavigatorSearch.indexFile('') and
 * getProcessIdsFromFile('') call this._fileSystem.readFile('') without
 * guarding against an empty/blank filePath.
 *
 * setFileIndex has a guard: if (!filePath || !filePath.trim()) return;
 * But that guard is AFTER readFile is already called.
 * Both indexFile and getProcessIdsFromFile lack an early guard for empty paths.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-NULL-011: indexFile and getProcessIdsFromFile called with empty/blank path', () => {

  it('indexFile("") should not call fileSystem.readFile', async () => {
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

    await search.indexFile('');

    assert.strictEqual(
      readFileCalled,
      false,
      'indexFile("") must NOT call fileSystem.readFile - empty string is not a valid path'
    );
  });

  it('indexFile("   ") should not call fileSystem.readFile', async () => {
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

    await search.indexFile('   ');

    assert.strictEqual(
      readFileCalled,
      false,
      'indexFile("   ") must NOT call fileSystem.readFile - whitespace-only string is not a valid path'
    );
  });

  it('getProcessIdsFromFile("") should not call fileSystem.readFile', async () => {
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

    const result = await search.getProcessIdsFromFile('');

    assert.strictEqual(
      readFileCalled,
      false,
      'getProcessIdsFromFile("") must NOT call fileSystem.readFile - empty string is not a valid path'
    );
    assert.deepStrictEqual(result, []);
  });
});
