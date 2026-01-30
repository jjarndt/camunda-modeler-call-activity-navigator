import test from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

test('setFileIndex stores and returns locations', () => {
  const index = new ProcessIndex();
  index.setFileIndex('/a.bpmn', ['p1', 'p2']);

  assert.equal(index.isIndexed('/a.bpmn'), true);
  assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
  assert.deepEqual(index.getLocations('p2'), [{ path: '/a.bpmn' }]);
  assert.deepEqual(index.getLocations('missing'), []);
});

test('removeFile clears process mappings', () => {
  const index = new ProcessIndex();
  index.setFileIndex('/a.bpmn', ['p1', 'p2']);
  index.setFileIndex('/b.bpmn', ['p2']);

  index.removeFile('/a.bpmn');

  assert.equal(index.isIndexed('/a.bpmn'), false);
  assert.deepEqual(index.getLocations('p1'), []);
  assert.deepEqual(index.getLocations('p2'), [{ path: '/b.bpmn' }]);
});

test('setFileIndex replaces old mappings for the same file', () => {
  const index = new ProcessIndex();
  index.setFileIndex('/a.bpmn', ['p1', 'p2']);
  index.setFileIndex('/a.bpmn', ['p3']);

  assert.deepEqual(index.getLocations('p1'), []);
  assert.deepEqual(index.getLocations('p2'), []);
  assert.deepEqual(index.getLocations('p3'), [{ path: '/a.bpmn' }]);
});
