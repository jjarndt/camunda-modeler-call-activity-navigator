import test from 'node:test';
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

test('searchInKnownFiles indexes each file once, even if it has no processes', async () => {
  const collab = await readFixture('collaboration-only.bpmn');
  const single = await readFixture('single-process.bpmn');

  const files = new Map([
    ['/proj/collab.bpmn', collab],
    ['/proj/single.bpmn', single]
  ]);
  const readCounts = new Map();
  const fileSystem = createFileSystem(files, readCounts);
  const index = new ProcessIndex();
  const search = new NavigatorSearch({ fileSystem, index });
  const knownFiles = new Set(files.keys());

  const found = await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);
  assert.equal(found, '/proj/single.bpmn');

  await search.searchInKnownFiles('Process_A', '/proj/current.bpmn', knownFiles);

  assert.equal(readCounts.get('/proj/collab.bpmn'), 1);
  assert.equal(readCounts.get('/proj/single.bpmn'), 1);
});

test('invalidateFile forces reindex and updates process mapping', async () => {
  const single = await readFixture('single-process.bpmn');
  const updated = single.replace('Process_A', 'Process_B');

  const files = new Map([['/proj/single.bpmn', single]]);
  const readCounts = new Map();
  const fileSystem = createFileSystem(files, readCounts);
  const index = new ProcessIndex();
  const search = new NavigatorSearch({ fileSystem, index });
  const knownFiles = new Set(files.keys());

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
