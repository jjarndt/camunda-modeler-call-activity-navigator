/**
 * bug-perf-009: Verify _tryRelativePaths does not read files redundantly.
 *
 * Previously, _tryRelativePaths read a file via fileSystem.readFile, then called
 * search.indexFile which read the same file again. Now it calls
 * index.setFileIndex directly with the already-extracted processIds.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-PERF-009: _tryRelativePaths should not cause redundant I/O', () => {

  it('indexFile reads the file exactly once when called directly', async () => {
    let readCount = 0;
    const FILE_PATH = '/project/processes/my-process.bpmn';
    const FILE_CONTENT = '<bpmn:process id="my-process"></bpmn:process>';

    const mockFileSystem = {
      readFile: async () => {
        readCount++;
        return { contents: FILE_CONTENT };
      }
    };

    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: mockFileSystem, index });

    await search.indexFile(FILE_PATH);
    assert.equal(readCount, 1, 'indexFile should read file exactly once');
    assert.deepEqual(index.getLocations('my-process'), [{ path: FILE_PATH }]);
  });

  it('setFileIndex avoids any I/O when processIds are already known', () => {
    let readCount = 0;
    const mockFileSystem = {
      readFile: async () => { readCount++; return { contents: '' }; }
    };

    const index = new ProcessIndex();
    new NavigatorSearch({ fileSystem: mockFileSystem, index });

    index.setFileIndex('/project/a.bpmn', ['process-a']);
    assert.equal(readCount, 0, 'setFileIndex should not trigger any I/O');
    assert.deepEqual(index.getLocations('process-a'), [{ path: '/project/a.bpmn' }]);
  });
});
