import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex - many files tracking', () => {

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
