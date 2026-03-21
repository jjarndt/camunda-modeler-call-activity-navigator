import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex - undefined processIds', () => {

  it('setFileIndex with undefined processIds marks file as indexed with no processes', () => {
    const index = new ProcessIndex();

    // explicit undefined
    index.setFileIndex('/a.bpmn', undefined);

    assert.equal(index.isIndexed('/a.bpmn'), true);
    assert.deepEqual(index.getLocations('anyProcess'), []);

    // missing second argument (implicit undefined)
    index.setFileIndex('/b.bpmn');

    assert.equal(index.isIndexed('/b.bpmn'), true);
    assert.deepEqual(index.getLocations('anyProcess'), []);
  });
});
