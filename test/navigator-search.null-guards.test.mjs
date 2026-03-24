import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

function makeSearch() {
  return new NavigatorSearch({
    fileSystem: { readFile: async () => ({ contents: '' }) },
    index: new ProcessIndex()
  });
}

function createMockFS(files) {
  return {
    readFile: async (path) => {
      if (files.has(path)) return { contents: files.get(path) };
      throw new Error('File not found');
    }
  };
}

describe('NavigatorSearch - null and empty input guards', () => {

  describe('null currentFilePath', () => {

    it('does not throw when currentFilePath is null', async () => {
      const index = new ProcessIndex();
      index.setFileIndex('/project/other.bpmn', ['myProcess']);
      const fileSystem = {
        readFile: async () => ({ contents: '<process id="myProcess"/>' })
      };
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.searchInKnownFiles('myProcess', null, new Set(['/project/other.bpmn']));
      assert.ok(result === null || typeof result === 'string');
    });
  });

  describe('null/undefined knownFiles', () => {

    it('does not throw when knownFiles is null', async () => {
      const fileSystem = createMockFS(new Map());
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.searchInKnownFiles('SomeProcess', '/proj/current.bpmn', null);
      assert.equal(result, null);
    });

    it('does not throw when knownFiles is undefined', async () => {
      const fileSystem = createMockFS(new Map());
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.searchInKnownFiles('SomeProcess', '/proj/current.bpmn', undefined);
      assert.equal(result, null);
    });
  });

  describe('null entries in knownFiles', () => {

    it('tolerates null entries in knownFiles Set', async () => {
      const index = new ProcessIndex();
      const fileSystem = {
        readFile: async (path) => {
          if (path && path.includes('other')) {
            return { contents: '<process id="myProcess"/>' };
          }
          throw new Error('file not found');
        }
      };
      const search = new NavigatorSearch({ fileSystem, index });

      const knownFiles = new Set([null, '/project/other.bpmn', undefined]);

      await assert.doesNotReject(
        async () => search.searchInKnownFiles('myProcess', '/project/current.bpmn', knownFiles),
        'searchInKnownFiles must tolerate null/undefined in knownFiles'
      );
    });

    it('tolerates null entries in knownFiles Array', async () => {
      const index = new ProcessIndex();
      const fileSystem = {
        readFile: async () => ({ contents: '<process id="test"/>' })
      };
      const search = new NavigatorSearch({ fileSystem, index });

      const knownFiles = [null, '/project/file.bpmn', undefined, ''];

      await assert.doesNotReject(
        async () => search.searchInKnownFiles('test', '/project/current.bpmn', knownFiles),
        'searchInKnownFiles must tolerate null/undefined entries in Array'
      );
    });
  });

  describe('null/undefined locations in findBestMatch', () => {

    it('findBestMatch(null) does not throw TypeError', () => {
      const search = makeSearch();
      assert.doesNotThrow(() => {
        search.findBestMatch(null, '/some/file.bpmn');
      }, 'findBestMatch(null) must handle null safely');
    });

    it('findBestMatch(undefined) does not throw TypeError', () => {
      const search = makeSearch();
      assert.doesNotThrow(() => {
        search.findBestMatch(undefined, '/some/file.bpmn');
      }, 'findBestMatch(undefined) must handle undefined safely');
    });
  });

  describe('readFile returning null', () => {

    it('getProcessIdsFromFile handles readFile returning null', async () => {
      const fileSystem = { readFile: async () => null };
      const search = new NavigatorSearch({
        fileSystem,
        index: new ProcessIndex()
      });

      const result = await search.getProcessIdsFromFile('/proj/test.bpmn');
      assert.deepStrictEqual(result, []);
    });
  });

  describe('indexFile with null path', () => {

    it('indexFile(null) should not call fileSystem.readFile', async () => {
      let readFileCalled = false;
      const fileSystem = {
        readFile: async () => {
          readFileCalled = true;
          return { contents: '' };
        }
      };

      const search = new NavigatorSearch({
        fileSystem,
        index: new ProcessIndex()
      });

      await assert.doesNotThrow(async () => {
        await search.indexFile(null);
      });

      assert.strictEqual(
        readFileCalled,
        false,
        'indexFile(null) must NOT call fileSystem.readFile'
      );
    });

    it('searchInKnownFiles with null element in knownFiles must not call indexFile(null)', async () => {
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

      const knownFiles = new Set([null, '/some/other/file.bpmn']);
      await search.searchInKnownFiles('Process_1', '/current/file.bpmn', knownFiles);

      assert.strictEqual(
        readFileCalledWithNull,
        false,
        'searchInKnownFiles must skip null/undefined/empty elements in knownFiles'
      );
    });
  });

  describe('indexFile with empty/blank path', () => {

    it('indexFile("") should not call fileSystem.readFile', async () => {
      let readFileCalled = false;
      const fileSystem = {
        readFile: async () => {
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
        'indexFile("") must NOT call fileSystem.readFile'
      );
    });

    it('indexFile("   ") should not call fileSystem.readFile', async () => {
      let readFileCalled = false;
      const fileSystem = {
        readFile: async () => {
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
        'indexFile("   ") must NOT call fileSystem.readFile'
      );
    });

    it('getProcessIdsFromFile("") should not call fileSystem.readFile', async () => {
      let readFileCalled = false;
      const fileSystem = {
        readFile: async () => {
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
        'getProcessIdsFromFile("") must NOT call fileSystem.readFile'
      );
      assert.deepStrictEqual(result, []);
    });
  });

  describe('constructor null dependency guards', () => {

    it('rejects null fileSystem at construction time', () => {
      assert.throws(
        () => new NavigatorSearch({ fileSystem: null, index: new ProcessIndex() }),
        TypeError,
        'Constructor must reject null fileSystem'
      );
    });

    it('rejects null index at construction time', () => {
      assert.throws(
        () => new NavigatorSearch({ fileSystem: { readFile: async () => ({}) }, index: null }),
        TypeError,
        'Constructor must reject null index'
      );
    });

    it('rejects undefined fileSystem at construction time', () => {
      assert.throws(
        () => new NavigatorSearch({ fileSystem: undefined, index: new ProcessIndex() }),
        TypeError,
        'Constructor must reject undefined fileSystem'
      );
    });
  });
});
