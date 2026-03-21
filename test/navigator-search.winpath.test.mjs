import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.findBestMatch', () => {

  it('findBestMatch works with Windows-style backslash paths', () => {
    const search = new NavigatorSearch({
      fileSystem: {},
      index: new ProcessIndex()
    });

    const locations = [
      { path: 'C:\\proj\\sub\\a.bpmn' },
      { path: 'C:\\other\\b.bpmn' }
    ];

    const currentFilePath = 'C:\\proj\\sub\\current.bpmn';

    const result = search.findBestMatch(locations, currentFilePath);

    assert.equal(result.path, 'C:\\proj\\sub\\a.bpmn');
  });
});
