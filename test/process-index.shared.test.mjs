import test from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

test('removeFile preserves other files sharing the same processId', () => {
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
