/**
 * bug-perf-004: Verify searchInKnownFiles uses early exit to avoid unnecessary I/O.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

const BPMN = (id) => `<bpmn:process id="${id}" isExecutable="true"/>`;

describe('BUG-PERF-004: searchInKnownFiles early exit avoids N+1 I/O', () => {

  it('stops reading after first match is found', async () => {
    const FILE_COUNT = 10;
    let readCount = 0;

    const files = new Map();
    const knownFiles = [];
    for (let i = 0; i < FILE_COUNT; i++) {
      const path = `/proj/file${i}.bpmn`;
      files.set(path, BPMN(`process-${i}`));
      knownFiles.push(path);
    }

    const fileSystem = {
      readFile: async (path) => {
        readCount++;
        if (files.has(path)) return { contents: files.get(path) };
        throw new Error('File not found');
      }
    };

    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    await search.searchInKnownFiles('process-0', '/proj/current.bpmn', knownFiles);

    assert.ok(readCount < FILE_COUNT,
      `Expected early exit (< ${FILE_COUNT} reads), got ${readCount}`);
  });

  it('reads sequentially with max 1 concurrent read', async () => {
    const FILE_COUNT = 50;
    let concurrent = 0;
    let maxConcurrent = 0;

    const fileSystem = {
      readFile: async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Promise.resolve();
        concurrent--;
        return { contents: BPMN('p') };
      }
    };

    const knownFiles = Array.from({ length: FILE_COUNT }, (_, i) => `/proj/file${i}.bpmn`);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    await search.searchInKnownFiles('p', '/proj/current.bpmn', knownFiles);

    assert.equal(maxConcurrent, 1, `Max concurrent reads: ${maxConcurrent}`);
  });
});
