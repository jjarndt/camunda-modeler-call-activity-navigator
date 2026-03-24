import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';
import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('ProcessIndex', () => {

  describe('setFileIndex', () => {

    it('stores process IDs and marks file as indexed', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p2']);

      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
      assert.deepEqual(index.getLocations('p2'), [{ path: '/a.bpmn' }]);
      assert.deepEqual(index.getLocations('missing'), []);
    });

    it('replaces old mappings when called again for the same file', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p2']);
      index.setFileIndex('/a.bpmn', ['p3']);

      assert.deepEqual(index.getLocations('p1'), []);
      assert.deepEqual(index.getLocations('p2'), []);
      assert.deepEqual(index.getLocations('p3'), [{ path: '/a.bpmn' }]);
    });

    it('deduplicates repeated process IDs', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p1', 'p1']);

      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
    });

    it('returns multiple files when they share a process ID', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['shared']);
      index.setFileIndex('/b.bpmn', ['shared']);

      assert.deepEqual(index.getLocations('shared'), [
        { path: '/a.bpmn' },
        { path: '/b.bpmn' }
      ]);
    });

    it('with same file twice does not duplicate entries', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['proc1']);
      index.setFileIndex('/a.bpmn', ['proc1']);

      const locations = index.getLocations('proc1');
      assert.equal(locations.length, 1,
        `Expected 1 location, got ${locations.length}`);
    });

    it('updates processIds correctly (old removed, new added)', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['proc1']);
      assert.equal(index.getLocations('proc1').length, 1);
      assert.equal(index.getLocations('proc2').length, 0);

      index.setFileIndex('/a.bpmn', ['proc2']);
      assert.equal(index.getLocations('proc1').length, 0,
        'proc1 should be removed after re-indexing with proc2');
      assert.equal(index.getLocations('proc2').length, 1);
    });

    it('with empty array marks file as indexed with no processes', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', []);

      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('anyProcess'), []);
    });

    it('with null marks file as indexed with no processes', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', null);

      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('anyProcess'), []);
    });

    it('with undefined processIds marks file as indexed with no processes', () => {
      const index = new ProcessIndex();

      index.setFileIndex('/a.bpmn', undefined);
      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('anyProcess'), []);

      index.setFileIndex('/b.bpmn');
      assert.equal(index.isIndexed('/b.bpmn'), true);
      assert.deepEqual(index.getLocations('anyProcess'), []);
    });

    it('does not throw when processIds is a plain object', () => {
      const index = new ProcessIndex();
      assert.doesNotThrow(() => index.setFileIndex('/a.bpmn', {}));
      assert.deepStrictEqual(index.getLocations('anything'), []);
    });

    it('does not throw when processIds is a number', () => {
      const index = new ProcessIndex();
      assert.doesNotThrow(() => index.setFileIndex('/a.bpmn', 42));
    });

    it('does not throw when processIds is a string', () => {
      const index = new ProcessIndex();
      assert.doesNotThrow(() => index.setFileIndex('/a.bpmn', 'Process_1'));
    });
  });

  describe('removeFile', () => {

    it('clears process mappings for the removed file', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p2']);
      index.setFileIndex('/b.bpmn', ['p2']);

      index.removeFile('/a.bpmn');

      assert.equal(index.isIndexed('/a.bpmn'), false);
      assert.deepEqual(index.getLocations('p1'), []);
      assert.deepEqual(index.getLocations('p2'), [{ path: '/b.bpmn' }]);
    });

    it('preserves other files sharing the same processId', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['shared', 'onlyA']);
      index.setFileIndex('/b.bpmn', ['shared', 'onlyB']);

      index.removeFile('/a.bpmn');

      assert.deepEqual(index.getLocations('shared'), [{ path: '/b.bpmn' }]);
      assert.deepEqual(index.getLocations('onlyA'), []);
      assert.deepEqual(index.getLocations('onlyB'), [{ path: '/b.bpmn' }]);
      assert.equal(index.isIndexed('/a.bpmn'), false);
      assert.equal(index.isIndexed('/b.bpmn'), true);
    });

    it('on a non-indexed file is a no-op', () => {
      const index = new ProcessIndex();
      index.removeFile('/nonexistent.bpmn');

      index.setFileIndex('/a.bpmn', ['p1']);
      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
    });

    it('removeFile(null) does not throw', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/some/file.bpmn', ['proc1']);

      assert.doesNotThrow(
        () => index.removeFile(null),
        'removeFile(null) should not throw'
      );
    });
  });

  describe('clear and rebuild cycle', () => {

    it('internal maps are clean after removing all files', () => {
      const index = new ProcessIndex();

      index.setFileIndex('/a.bpmn', ['p1']);
      index.setFileIndex('/b.bpmn', ['p2']);
      index.setFileIndex('/c.bpmn', ['p1', 'p2']);

      index.removeFile('/a.bpmn');
      index.removeFile('/b.bpmn');
      index.removeFile('/c.bpmn');

      assert.strictEqual(index.isIndexed('/a.bpmn'), false);
      assert.strictEqual(index.isIndexed('/b.bpmn'), false);
      assert.strictEqual(index.isIndexed('/c.bpmn'), false);

      assert.deepStrictEqual(index.getLocations('p1'), []);
      assert.deepStrictEqual(index.getLocations('p2'), []);

      index.setFileIndex('/d.bpmn', ['p1']);
      assert.deepStrictEqual(index.getLocations('p1'), [{ path: '/d.bpmn' }]);
    });

    it('handles complete clear and rebuild cycle', () => {
      const index = new ProcessIndex();

      index.setFileIndex('/a.bpmn', ['p1', 'p2']);
      index.setFileIndex('/b.bpmn', ['p2', 'p3']);

      index.removeFile('/a.bpmn');
      index.removeFile('/b.bpmn');

      assert.equal(index.isIndexed('/a.bpmn'), false);
      assert.equal(index.isIndexed('/b.bpmn'), false);
      assert.deepEqual(index.getLocations('p1'), []);
      assert.deepEqual(index.getLocations('p2'), []);
      assert.deepEqual(index.getLocations('p3'), []);

      index.setFileIndex('/c.bpmn', ['p1', 'p4']);
      assert.equal(index.isIndexed('/c.bpmn'), true);
      assert.deepEqual(index.getLocations('p1'), [{ path: '/c.bpmn' }]);
      assert.deepEqual(index.getLocations('p4'), [{ path: '/c.bpmn' }]);
    });

    it('entries are garbage collected when no files reference them', () => {
      const index = new ProcessIndex();

      for (let i = 0; i < 100; i++) {
        index.setFileIndex(`/file${i}.bpmn`, [`proc${i}`]);
      }

      for (let i = 0; i < 100; i++) {
        index.removeFile(`/file${i}.bpmn`);
      }

      for (let i = 0; i < 100; i++) {
        const locations = index.getLocations(`proc${i}`);
        assert.equal(locations.length, 0,
          `proc${i} should have 0 locations after all files removed`);
      }

      index.setFileIndex('/new.bpmn', ['proc0']);
      assert.equal(index.getLocations('proc0').length, 1);
    });
  });

  describe('many files tracking', () => {

    it('tracks many files for the same processId and maintains order', () => {
      const index = new ProcessIndex();

      index.setFileIndex('/a.bpmn', ['SharedProcess']);
      index.setFileIndex('/b.bpmn', ['SharedProcess']);
      index.setFileIndex('/c.bpmn', ['SharedProcess']);
      index.setFileIndex('/d.bpmn', ['SharedProcess']);
      index.setFileIndex('/e.bpmn', ['SharedProcess']);

      assert.deepEqual(index.getLocations('SharedProcess'), [
        { path: '/a.bpmn' },
        { path: '/b.bpmn' },
        { path: '/c.bpmn' },
        { path: '/d.bpmn' },
        { path: '/e.bpmn' }
      ]);

      index.removeFile('/c.bpmn');

      assert.deepEqual(index.getLocations('SharedProcess'), [
        { path: '/a.bpmn' },
        { path: '/b.bpmn' },
        { path: '/d.bpmn' },
        { path: '/e.bpmn' }
      ]);
      assert.equal(index.getLocations('SharedProcess').length, 4);
      assert.equal(index.isIndexed('/c.bpmn'), false);
    });
  });

  describe('interleaved add and remove', () => {

    it('handles interleaved add and remove operations correctly', () => {
      const index = new ProcessIndex();

      index.setFileIndex('/a.bpmn', ['p1']);
      index.setFileIndex('/b.bpmn', ['p1', 'p2']);
      index.removeFile('/a.bpmn');
      index.setFileIndex('/c.bpmn', ['p1', 'p3']);
      index.removeFile('/b.bpmn');
      index.setFileIndex('/d.bpmn', ['p2']);

      assert.deepStrictEqual(index.getLocations('p1'), [{ path: '/c.bpmn' }]);
      assert.deepStrictEqual(index.getLocations('p2'), [{ path: '/d.bpmn' }]);
      assert.deepStrictEqual(index.getLocations('p3'), [{ path: '/c.bpmn' }]);

      assert.equal(index.isIndexed('/a.bpmn'), false);
      assert.equal(index.isIndexed('/b.bpmn'), false);
      assert.equal(index.isIndexed('/c.bpmn'), true);
      assert.equal(index.isIndexed('/d.bpmn'), true);
    });
  });

  describe('getLocations immutability', () => {

    it('mutating the returned array does not affect the index', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1']);

      const locations = index.getLocations('p1');
      locations.push({ path: '/injected.bpmn' });

      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }],
        'internal array was corrupted by external push()');
    });

    it('mutating a returned location object does not corrupt the index', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['P1']);

      const locations = index.getLocations('P1');
      assert.equal(locations[0].path, '/a.bpmn');

      locations[0].path = '/mutated.bpmn';

      const locationsAfter = index.getLocations('P1');
      assert.equal(locationsAfter[0].path, '/a.bpmn',
        'Internal index corrupted: location.path was changed by external mutation');
    });

    it('removeFile still works after a caller mutates a returned location', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['P1']);

      const locations = index.getLocations('P1');
      locations[0].path = '/mutated.bpmn';

      index.removeFile('/a.bpmn');

      const locationsAfterRemove = index.getLocations('P1');
      assert.equal(locationsAfterRemove.length, 0,
        'After removeFile, locations should be empty');
    });
  });

  describe('falsy processId keys', () => {

    it('does not store undefined as a processId key', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/foo/bar.bpmn', [undefined, null, '', 'validId']);

      const undefinedLocations = index.getLocations(undefined);
      assert.equal(undefinedLocations.length, 0,
        'getLocations(undefined) should return empty array');
    });

    it('does not store null as a processId key', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/foo/bar.bpmn', [null]);

      const nullLocations = index.getLocations(null);
      assert.equal(nullLocations.length, 0,
        'getLocations(null) should return empty array');
    });

    it('does not store empty string as a processId key', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/foo/bar.bpmn', ['', 'realId']);

      const emptyLocations = index.getLocations('');
      assert.equal(emptyLocations.length, 0,
        'getLocations("") should return empty array');
    });
  });

  describe('processId type coercion', () => {

    it('setFileIndex with number processId is retrievable by both number and string', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/file.bpmn', [42]);

      const numResult = index.getLocations(42);
      assert.strictEqual(numResult.length, 1, 'Number key lookup works');

      const strResult = index.getLocations('42');
      assert.strictEqual(strResult.length, 1, 'String key lookup also works after coercion');
    });

    it('removeFile correctly cleans up coerced processIds', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/file.bpmn', [42, 'hello']);

      index.removeFile('/file.bpmn');

      assert.strictEqual(index.getLocations('42').length, 0);
      assert.strictEqual(index.getLocations('hello').length, 0);
      assert.strictEqual(index.isIndexed('/file.bpmn'), false);
    });
  });

  describe('getLocations with unusual input types', () => {

    it('getLocations with Symbol input does not crash', () => {
      const index = new ProcessIndex();
      const sym = Symbol('testProcess');
      assert.doesNotThrow(
        () => index.getLocations(sym),
        'getLocations must tolerate Symbol input'
      );
    });

    it('NavigatorSearch.getLocations with Symbol input does not crash', () => {
      const search = new NavigatorSearch({
        fileSystem: { readFile: async () => ({ contents: '' }) },
        index: new ProcessIndex()
      });
      const sym = Symbol('myProcess');
      assert.doesNotThrow(
        () => search.getLocations(sym),
        'NavigatorSearch.getLocations must tolerate Symbol input'
      );
    });

    it('getLocations with object having broken toString() does not crash', () => {
      const index = new ProcessIndex();
      const broken = {
        toString() { throw new Error('toString crashed!'); }
      };

      assert.doesNotThrow(
        () => index.getLocations(broken),
        'getLocations must tolerate objects with broken toString()'
      );
    });
  });

  describe('null/undefined path handling', () => {

    it('isIndexed(null) returns false', () => {
      const index = new ProcessIndex();
      const result = index.isIndexed(null);
      assert.equal(result, false, 'isIndexed(null) should return false');
    });

    it('setFileIndex(null, [...]) - isIndexed(null) returns false', () => {
      const index = new ProcessIndex();
      index.setFileIndex(null, ['proc1']);

      const result = index.isIndexed(null);
      assert.equal(result, false,
        'isIndexed(null) must return false - null is not a valid path');
    });
  });

  describe('relative dot path rejection', () => {

    it('normalizePath(".") returns "."', () => {
      assert.equal(normalizePath('.', '/'), '.');
    });

    it('normalizePath("..") returns ".."', () => {
      assert.equal(normalizePath('..', '/'), '..');
    });

    it('setFileIndex with ".." does not create an entry', () => {
      const index = new ProcessIndex();
      index.setFileIndex('..', ['relativeProcess']);
      const locs = index.getLocations('relativeProcess');
      assert.equal(locs.length, 0,
        'setFileIndex should reject relative paths like ".."');
    });

    it('setFileIndex with "." path should not store relative path in index', () => {
      const index = new ProcessIndex();
      index.setFileIndex('.', ['myProcess']);

      const locations = index.getLocations('myProcess');
      if (locations.length > 0) {
        assert.notEqual(locations[0].path, '.',
          '"." should not be stored as a valid process file path');
      }
    });

    it('setFileIndex with empty normalized path creates no entry', () => {
      const index = new ProcessIndex();
      index.setFileIndex('', ['myProcess']);
      const locations = index.getLocations('myProcess');
      assert.deepStrictEqual(locations, [],
        'Empty path must not create index entries');
    });
  });

  describe('whitespace path rejection', () => {

    it('normalizePath with whitespace-only input is handled by ProcessIndex', () => {
      const result = normalizePath('   ');
      const idx = new ProcessIndex();
      idx.setFileIndex(result, ['test-process']);
      const locs = idx.getLocations('test-process');
      assert.equal(locs.length, 0, 'Whitespace path should not create location entries');
    });

    it('setFileIndex rejects whitespace-only path', () => {
      const idx = new ProcessIndex();
      idx.setFileIndex('   ', ['ghost-process']);
      assert.equal(idx.getLocations('ghost-process').length, 0);
    });
  });

  describe('internal array mutation safety', () => {

    it('getLocations returns snapshot, not live reference', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['proc1']);

      const locations = index.getLocations('proc1');
      locations.push({ path: '/injected.bpmn' });

      const locationsAgain = index.getLocations('proc1');
      assert.equal(locationsAgain.length, 1,
        'getLocations should return a copy, not a live reference');
    });
  });

  describe('mixed path separators', () => {

    it('setFileIndex with backslash then forward-slash overwrites (no duplicates)', () => {
      const index = new ProcessIndex();
      index.setFileIndex('C:\\proj\\a.bpmn', ['MyProcess']);
      index.setFileIndex('C:/proj/a.bpmn', ['MyProcess']);

      const locations = index.getLocations('MyProcess');
      assert.equal(locations.length, 1,
        'must have exactly one entry, not two duplicates from mixed separators');
    });

    it('removeFile with forward-slash removes backslash-indexed entry', () => {
      const index = new ProcessIndex();
      index.setFileIndex('C:\\proj\\a.bpmn', ['MyProcess']);
      index.removeFile('C:/proj/a.bpmn');

      assert.equal(index.isIndexed('C:\\proj\\a.bpmn'), false);
      assert.equal(index.isIndexed('C:/proj/a.bpmn'), false);
      assert.deepEqual(index.getLocations('MyProcess'), []);
    });

    it('isIndexed recognizes file regardless of separator style', () => {
      const index = new ProcessIndex();
      index.setFileIndex('C:\\proj\\a.bpmn', ['MyProcess']);

      assert.equal(index.isIndexed('C:/proj/a.bpmn'), true,
        'must find the file even when queried with forward slashes');
    });

    it('should not create duplicate entries for backslash vs forward-slash paths', () => {
      const index = new ProcessIndex();

      index.setFileIndex('\\project\\file.bpmn', ['Process_A']);
      index.setFileIndex('/project/file.bpmn', ['Process_A']);

      const locations = index.getLocations('Process_A');
      assert.strictEqual(locations.length, 1,
        `Same file with different separators should produce 1 entry, got ${locations.length}`);
    });

    it('should treat leading backslash as root like forward slash', () => {
      const index = new ProcessIndex();

      index.setFileIndex('\\project\\file.bpmn', ['Process_B']);

      const locations = index.getLocations('Process_B');
      assert.strictEqual(locations.length, 1);
      assert.strictEqual(locations[0].path, '/project/file.bpmn');
    });
  });
});
