import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex', () => {

  describe('setFileIndex', () => {

    test('stores process IDs and marks file as indexed', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p2']);

      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
      assert.deepEqual(index.getLocations('p2'), [{ path: '/a.bpmn' }]);
      assert.deepEqual(index.getLocations('missing'), []);
    });

    test('replaces old mappings when called again for the same file', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p2']);
      index.setFileIndex('/a.bpmn', ['p3']);

      assert.deepEqual(index.getLocations('p1'), []);
      assert.deepEqual(index.getLocations('p2'), []);
      assert.deepEqual(index.getLocations('p3'), [{ path: '/a.bpmn' }]);
    });

    test('deduplicates repeated process IDs', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p1', 'p1']);

      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
    });

    test('returns multiple files when they share a process ID', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['shared']);
      index.setFileIndex('/b.bpmn', ['shared']);

      assert.deepEqual(index.getLocations('shared'), [
        { path: '/a.bpmn' },
        { path: '/b.bpmn' }
      ]);
    });

  });

  describe('removeFile', () => {

    test('clears process mappings for the removed file', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', ['p1', 'p2']);
      index.setFileIndex('/b.bpmn', ['p2']);

      index.removeFile('/a.bpmn');

      assert.equal(index.isIndexed('/a.bpmn'), false);
      assert.deepEqual(index.getLocations('p1'), []);
      assert.deepEqual(index.getLocations('p2'), [{ path: '/b.bpmn' }]);
    });

  });

  describe('edge cases', () => {

    test('setFileIndex with empty array marks file as indexed with no processes', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', []);

      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('anyProcess'), []);
    });

    test('setFileIndex with null marks file as indexed with no processes', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/a.bpmn', null);

      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('anyProcess'), []);
    });

    test('removeFile on a non-indexed file is a no-op', () => {
      const index = new ProcessIndex();
      index.removeFile('/nonexistent.bpmn');

      index.setFileIndex('/a.bpmn', ['p1']);
      assert.equal(index.isIndexed('/a.bpmn'), true);
      assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
    });

  });

});
