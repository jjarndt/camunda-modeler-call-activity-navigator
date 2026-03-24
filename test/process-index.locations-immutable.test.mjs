import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-003: getLocations must not expose internal array', () => {

  test('mutating the returned array does not affect the index', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/a.bpmn', ['p1']);

    const locations = index.getLocations('p1');
    locations.push({ path: '/injected.bpmn' });

    assert.deepEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }],
      'internal array was corrupted by external push()');
  });

});
