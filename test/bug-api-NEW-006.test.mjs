/**
 * BUG-API-NEW-006: ProcessIndex now coerces non-string processIds to strings.
 *
 * setFileIndex converts all processIds to strings via String(id).trim().
 * getLocations also coerces the lookup key. This ensures consistent behavior
 * regardless of whether a number or string is used.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-NEW-006: ProcessIndex coerces non-string processIds to strings', () => {

  it('setFileIndex with number processId is retrievable by both number and string', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/file.bpmn', [42]);

    const numResult = index.getLocations(42);
    assert.strictEqual(numResult.length, 1, 'Number key lookup works');

    const strResult = index.getLocations('42');
    assert.strictEqual(strResult.length, 1, 'String key lookup also works after coercion');

    assert.strictEqual(numResult.length, strResult.length,
      'getLocations(42) and getLocations("42") should return same result');
  });

  it('removeFile correctly cleans up coerced processIds', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/file.bpmn', [42, 'hello']);

    index.removeFile('/file.bpmn');

    assert.strictEqual(index.getLocations('42').length, 0);
    assert.strictEqual(index.getLocations('hello').length, 0);
    assert.strictEqual(index.isIndexed('/file.bpmn'), false);
  });
});
