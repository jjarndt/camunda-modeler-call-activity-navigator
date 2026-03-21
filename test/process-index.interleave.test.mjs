import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex', () => {

  it('handles interleaved add and remove operations correctly', () => {
    const index = new ProcessIndex();

    index.setFileIndex('/a.bpmn', ['p1']);
    index.setFileIndex('/b.bpmn', ['p1', 'p2']);
    index.removeFile('/a.bpmn');
    index.setFileIndex('/c.bpmn', ['p1', 'p3']);
    index.removeFile('/b.bpmn');
    index.setFileIndex('/d.bpmn', ['p2']);

    // p1: only in /c.bpmn
    assert.deepStrictEqual(index.getLocations('p1'), [{ path: '/c.bpmn' }]);

    // p2: only in /d.bpmn
    assert.deepStrictEqual(index.getLocations('p2'), [{ path: '/d.bpmn' }]);

    // p3: only in /c.bpmn
    assert.deepStrictEqual(index.getLocations('p3'), [{ path: '/c.bpmn' }]);

    // isIndexed checks
    assert.equal(index.isIndexed('/a.bpmn'), false);
    assert.equal(index.isIndexed('/b.bpmn'), false);
    assert.equal(index.isIndexed('/c.bpmn'), true);
    assert.equal(index.isIndexed('/d.bpmn'), true);
  });
});
