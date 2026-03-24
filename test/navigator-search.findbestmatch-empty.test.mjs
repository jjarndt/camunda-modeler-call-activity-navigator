import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-004: findBestMatch([]) must return null, not undefined', () => {

  test('findBestMatch with empty array returns null', () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: {}, index });

    const result = search.findBestMatch([], '/some/current.bpmn');

    assert.equal(result, null,
      'findBestMatch([]) should return null, not undefined');
  });

  test('findBestMatch with empty array and no currentFilePath returns null', () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: {}, index });

    const result = search.findBestMatch([], null);

    assert.equal(result, null,
      'findBestMatch([], null) should return null, not undefined');
  });

});
