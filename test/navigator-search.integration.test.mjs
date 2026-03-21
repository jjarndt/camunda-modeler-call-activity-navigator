import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

async function readFixture(name) {
  const filePath = path.join(fixturesDir, name);
  return fs.readFile(filePath, 'utf-8');
}

function createFileSystem(files, readCounts) {
  return {
    readFile: async (filePath) => {
      readCounts.set(filePath, (readCounts.get(filePath) || 0) + 1);
      if (!files.has(filePath)) {
        throw new Error(`Missing fixture: ${filePath}`);
      }
      return { contents: files.get(filePath) };
    }
  };
}

function createSearch(files, readCounts) {
  const fileSystem = createFileSystem(files, readCounts);
  const index = new ProcessIndex();
  const search = new NavigatorSearch({ fileSystem, index });
  const knownFiles = new Set(files.keys());
  return { search, knownFiles };
}

describe('NavigatorSearch integration', () => {

  describe('searchInKnownFiles', () => {

    it('indexes each file only once, even if it has no processes', async () => {
      const collab = await readFixture('collaboration-only.bpmn');
      const single = await readFixture('single-process.bpmn');

      const files = new Map([
        ['/proj/collab.bpmn', collab],
        ['/proj/single.bpmn', single]
      ]);
      const readCounts = new Map();
      const { search, knownFiles } = createSearch(files, readCounts);

      const found = await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);
      assert.equal(found, '/proj/single.bpmn');

      await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);

      assert.equal(readCounts.get('/proj/collab.bpmn'), 1);
      assert.equal(readCounts.get('/proj/single.bpmn'), 1);
    });

    it('returns the closest match when processId exists in multiple files', async () => {
      const single = await readFixture('single-process.bpmn');

      const files = new Map([
        ['/proj/far/away/a.bpmn', single],
        ['/proj/sub/b.bpmn', single],
        ['/proj/sub/deep/c.bpmn', single]
      ]);
      const readCounts = new Map();
      const { search, knownFiles } = createSearch(files, readCounts);

      const found = await search.searchInKnownFiles(
        'Process_A', '/proj/sub/current.bpmn', knownFiles
      );
      assert.equal(found, '/proj/sub/b.bpmn');
    });

    it('returns null when processId is not found in any file', async () => {
      const single = await readFixture('single-process.bpmn');

      const files = new Map([
        ['/proj/a.bpmn', single],
        ['/proj/b.bpmn', single]
      ]);
      const readCounts = new Map();
      const { search, knownFiles } = createSearch(files, readCounts);

      const found = await search.searchInKnownFiles('NonExistent_Process', '/proj/current.bpmn', knownFiles);
      assert.equal(found, null);
    });

    it('skips the current file when searching', async () => {
      const single = await readFixture('single-process.bpmn');

      const files = new Map([
        ['/proj/current.bpmn', single]
      ]);
      const readCounts = new Map();
      const { search, knownFiles } = createSearch(files, readCounts);

      const found = await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);
      assert.equal(found, null);
      assert.equal(readCounts.has('/proj/current.bpmn'), false);
    });
  });

  describe('invalidateFile', () => {

    it('forces reindex and updates process mapping', async () => {
      const single = await readFixture('single-process.bpmn');
      const updated = single.replace('Process_A', 'Process_B');

      const files = new Map([['/proj/single.bpmn', single]]);
      const readCounts = new Map();
      const { search, knownFiles } = createSearch(files, readCounts);

      const foundInitial = await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);
      assert.equal(foundInitial, '/proj/single.bpmn');
      assert.equal(readCounts.get('/proj/single.bpmn'), 1);

      files.set('/proj/single.bpmn', updated);
      search.invalidateFile('/proj/single.bpmn');

      const foundOld = await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);
      assert.equal(foundOld, null);

      const foundNew = await search.searchInKnownFiles('Process_B', '/proj/current.bpmn', knownFiles);
      assert.equal(foundNew, '/proj/single.bpmn');
      assert.equal(readCounts.get('/proj/single.bpmn'), 2);
    });
  });

  describe('findBestMatch', () => {
    let search;

    beforeEach(() => {
      const index = new ProcessIndex();
      search = new NavigatorSearch({ fileSystem: {}, index });
    });

    it('returns the only location when there is exactly one', () => {
      const locations = [{ path: '/proj/only.bpmn' }];
      const result = search.findBestMatch(locations, '/proj/current.bpmn');
      assert.equal(result.path, '/proj/only.bpmn');
    });

    it('returns first location when currentFilePath is null', () => {
      const locations = [
        { path: '/proj/first.bpmn' },
        { path: '/proj/second.bpmn' }
      ];
      const result = search.findBestMatch(locations, null);
      assert.equal(result.path, '/proj/first.bpmn');
    });
  });
});
