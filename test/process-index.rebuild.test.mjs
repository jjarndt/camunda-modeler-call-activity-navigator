import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex', () => {

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
});
