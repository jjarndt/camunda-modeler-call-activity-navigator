import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex', () => {

  it('internal maps are clean after removing all files', () => {
    const index = new ProcessIndex();

    index.setFileIndex('/a.bpmn', ['p1']);
    index.setFileIndex('/b.bpmn', ['p2']);
    index.setFileIndex('/c.bpmn', ['p1', 'p2']);

    index.removeFile('/a.bpmn');
    index.removeFile('/b.bpmn');
    index.removeFile('/c.bpmn');

    assert.strictEqual(index.isIndexed('/a.bpmn'), false);
    assert.strictEqual(index.isIndexed('/b.bpmn'), false);
    assert.strictEqual(index.isIndexed('/c.bpmn'), false);

    assert.deepStrictEqual(index.getLocations('p1'), []);
    assert.deepStrictEqual(index.getLocations('p2'), []);

    index.setFileIndex('/d.bpmn', ['p1']);

    assert.deepStrictEqual(index.getLocations('p1'), [{ path: '/d.bpmn' }]);
  });
});
