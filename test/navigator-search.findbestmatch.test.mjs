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

function createSearch(files) {
  const index = new ProcessIndex();
  const fileContents = {};

  for (const [path, ids] of Object.entries(files)) {
    index.setFileIndex(path, ids);
    const xml = ids.map(id => `<bpmn:process id="${id}" />`).join('\n');
    fileContents[path] = xml;
  }

  return new NavigatorSearch({
    fileSystem: {
      readFile: async (p) => ({ contents: fileContents[p] || '' })
    },
    index
  });
}

describe('NavigatorSearch.findBestMatch', () => {

  describe('basic matching', () => {

    it('selects deepest common ancestor match', () => {
      const search = makeSearch();
      const locations = [
        { path: '/proj/a.bpmn' },
        { path: '/proj/sub/dir/b.bpmn' },
        { path: '/proj/sub/dir/nested/c.bpmn' }
      ];
      const result = search.findBestMatch(locations, '/proj/sub/dir/nested/current.bpmn');
      assert.equal(result.path, '/proj/sub/dir/nested/c.bpmn');
    });

    it('prefers file in the exact same directory', () => {
      const search = makeSearch();
      const locations = [
        { path: '/proj/sub/sibling.bpmn' },
        { path: '/proj/other.bpmn' },
        { path: '/proj/sub/nested/deep.bpmn' }
      ];
      const result = search.findBestMatch(locations, '/proj/sub/current.bpmn');
      assert.equal(result.path, '/proj/sub/sibling.bpmn');
    });

    it('works with Windows-style backslash paths', () => {
      const search = makeSearch();
      const locations = [
        { path: 'C:\\proj\\sub\\a.bpmn' },
        { path: 'C:\\other\\b.bpmn' }
      ];
      const result = search.findBestMatch(locations, 'C:\\proj\\sub\\current.bpmn');
      assert.equal(result.path, 'C:\\proj\\sub\\a.bpmn');
    });
  });

  describe('empty and null input', () => {

    it('returns null for empty locations array', () => {
      const search = makeSearch();
      assert.strictEqual(search.findBestMatch([], '/some/current.bpmn'), null);
    });

    it('returns null for empty locations with null currentFilePath', () => {
      const search = makeSearch();
      assert.strictEqual(search.findBestMatch([], null), null);
    });

    it('returns null for locations without .path', () => {
      const search = makeSearch();
      const result = search.findBestMatch([{ id: 'proc1' }], '/current.bpmn');
      assert.strictEqual(result, null,
        'Locations without .path should result in null');
    });

    it('returns location with .path for valid input', () => {
      const search = makeSearch();
      const result = search.findBestMatch(
        [{ path: '/a.bpmn' }, { path: '/b.bpmn' }],
        '/current.bpmn'
      );
      assert.ok(result?.path, 'Should return a location with .path');
    });

    it('returns first location when currentFilePath is empty string', () => {
      const search = makeSearch();
      const locations = [
        { path: '/a.bpmn' },
        { path: '/b.bpmn' }
      ];
      const resultEmpty = search.findBestMatch(locations, '');
      assert.deepEqual(resultEmpty, { path: '/a.bpmn' });

      const resultUndefined = search.findBestMatch(locations, undefined);
      assert.deepEqual(resultUndefined, { path: '/a.bpmn' });
    });

    it('returns first location when currentFilePath is null', () => {
      const search = makeSearch();
      const locations = [
        { path: '/proj/first.bpmn' },
        { path: '/proj/second.bpmn' }
      ];
      const result = search.findBestMatch(locations, null);
      assert.equal(result.path, '/proj/first.bpmn');
    });

    it('returns first location when all scores are equal', () => {
      const search = makeSearch();
      const locations = [
        { path: '/x/alpha/a.bpmn' },
        { path: '/y/beta/b.bpmn' },
        { path: '/z/gamma/c.bpmn' }
      ];
      const result = search.findBestMatch(locations, '/w/delta/current.bpmn');
      assert.equal(result.path, '/x/alpha/a.bpmn');
    });
  });

  describe('tie-breaking', () => {

    it('same-depth locations produce same result regardless of input order', () => {
      const search = makeSearch();

      const locationsOrderA = [
        { path: '/project/src/moduleA/process.bpmn' },
        { path: '/project/src/moduleB/process.bpmn' }
      ];
      const locationsOrderB = [
        { path: '/project/src/moduleB/process.bpmn' },
        { path: '/project/src/moduleA/process.bpmn' }
      ];

      const currentFile = '/project/src/moduleC/current.bpmn';

      const resultA = search.findBestMatch(locationsOrderA, currentFile);
      const resultB = search.findBestMatch(locationsOrderB, currentFile);

      assert.equal(resultA.path, resultB.path,
        `findBestMatch should return the same result regardless of input order, ` +
        `but got '${resultA.path}' vs '${resultB.path}'`);
    });
  });

  describe('case-sensitive proximity scoring', () => {

    it('prefers nearby file even with different case in drive letter', () => {
      const search = makeSearch();
      const locationNear = { path: 'c:/projects/myapp/src/near.bpmn' };
      const locationFar = { path: 'C:/other/far.bpmn' };

      const best = search.findBestMatch(
        [locationFar, locationNear],
        'C:/projects/myapp/src/current.bpmn'
      );

      assert.strictEqual(best.path, locationNear.path,
        'findBestMatch must choose the nearby file even with different drive letter case');
    });

    it('scores 0 for identical paths with different case', () => {
      const search = makeSearch();
      const locationSameDir = { path: 'c:/users/dev/project/file.bpmn' };
      const locationOtherDir = { path: 'C:/tmp/other.bpmn' };

      const best = search.findBestMatch(
        [locationOtherDir, locationSameDir],
        'C:/Users/Dev/Project/current.bpmn'
      );

      assert.strictEqual(best.path, locationSameDir.path,
        'Paths with same content but different case must be recognized as nearby');
    });
  });

  describe('currentFilePath normalization', () => {

    it('picks closest match even with backslash currentFilePath', async () => {
      const search = createSearch({
        'C:\\far\\away\\file.bpmn': ['TargetProcess'],
        'C:\\project\\src\\nearby.bpmn': ['TargetProcess']
      });

      const knownFiles = new Set([
        'C:\\far\\away\\file.bpmn',
        'C:\\project\\src\\nearby.bpmn',
        'C:\\project\\src\\current.bpmn'
      ]);

      const result = await search.searchInKnownFiles(
        'TargetProcess',
        'C:\\project\\src\\current.bpmn',
        knownFiles
      );

      assert.strictEqual(
        result, 'C:/project/src/nearby.bpmn',
        `Should prefer nearby match, got: ${result}`
      );
    });

    it('normalizes Windows path before scoring', () => {
      const search = createSearch({});
      const locations = [
        { path: 'C:/far/away/file.bpmn' },
        { path: 'C:/project/src/nearby.bpmn' }
      ];

      const result = search.findBestMatch(locations, 'C:\\project\\src\\current.bpmn');

      assert.strictEqual(
        result.path, 'C:/project/src/nearby.bpmn',
        `Should prefer nearby match, got: ${result.path}`
      );
    });

    it('does not throw TypeError when all locations have invalid paths', async () => {
      const index = new ProcessIndex();
      const search = new NavigatorSearch({
        fileSystem: { readFile: async () => ({ contents: '' }) },
        index
      });

      index._locationsByProcess.set('Ghost', [{ path: null }, { path: undefined }]);
      index._processesByFile.set('fake.bpmn', new Set(['Ghost']));

      const knownFiles = new Set(['other.bpmn']);
      const result = await search.searchInKnownFiles('Ghost', 'current.bpmn', knownFiles);

      assert.strictEqual(result, null, 'Should return null without throwing');
    });
  });

  describe('redundant parentDir computation (performance)', () => {

    it('completes within time limit for M=500 locations', () => {
      const M = 500;
      const index = new ProcessIndex();
      for (let i = 0; i < M; i++) {
        index.setFileIndex(`/shared/sub${i % 10}/file-${i}.bpmn`, ['common-proc']);
      }

      const mockFS = {
        readFile: async () => { throw new Error('No I/O expected'); }
      };

      const search = new NavigatorSearch({ fileSystem: mockFS, index });
      const locations = index.getLocations('common-proc');

      assert.equal(locations.length, M, `Expected ${M} locations`);

      // Warm up
      search.findBestMatch(locations, '/proj/sub3/current.bpmn');

      const RUNS = 500;
      const start = Date.now();
      for (let r = 0; r < RUNS; r++) {
        search.findBestMatch(locations, '/proj/sub3/current.bpmn');
      }
      const elapsed = Date.now() - start;
      const perCallUs = Math.round((elapsed / RUNS) * 1000);

      assert.ok(
        perCallUs <= 5000,
        `findBestMatch with M=${M} locations takes ${perCallUs}us per call ` +
        `(${elapsed}ms / ${RUNS} runs). Limit: 5000us.`
      );
    });

    it('time scales linearly O(M) with number of locations', () => {
      function measureFindBestMatch(M) {
        const index = new ProcessIndex();
        for (let i = 0; i < M; i++) {
          index.setFileIndex(`/files/sub${i % 5}/file-${i}.bpmn`, ['proc']);
        }
        const mockFS = { readFile: async () => { throw new Error(); } };
        const search = new NavigatorSearch({ fileSystem: mockFS, index });
        const locs = index.getLocations('proc');

        search.findBestMatch(locs, '/files/sub2/current.bpmn');

        const RUNS = 300;
        const s = Date.now();
        for (let r = 0; r < RUNS; r++) {
          search.findBestMatch(locs, '/files/sub2/current.bpmn');
        }
        return (Date.now() - s) / RUNS;
      }

      const t100 = measureFindBestMatch(100);
      const t500 = measureFindBestMatch(500);

      const t100Us = Math.round(t100 * 1000);
      const t500Us = Math.round(t500 * 1000);

      assert.ok(
        t100Us <= 2000,
        `findBestMatch with M=100 locations takes ${t100Us}us per call. Limit: 2000us.`
      );

      assert.ok(
        t500Us <= 10000,
        `findBestMatch with M=500 locations takes ${t500Us}us per call. Limit: 10000us (linear to M=100: 5x).`
      );
    });
  });
});
