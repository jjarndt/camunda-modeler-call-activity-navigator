/**
 * BUG-API-028: NavigatorSearch.findBestMatch has no tie-breaking logic
 * when multiple locations share the same commonPrefixLength score.
 * The first element with the best score wins, which depends on input
 * order rather than any deterministic criterion.
 *
 * More specifically: findBestMatch uses `score > bestScore` (strict greater),
 * meaning the first location with a given score wins. If two locations
 * share the same parent directory depth, the result depends on array order.
 *
 * This is an API contract issue: callers expect deterministic results,
 * but the output depends on arbitrary input ordering.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';
import { NavigatorSearch } from '../client/navigator-search.mjs';

function makeSearch() {
  const index = new ProcessIndex();
  return new NavigatorSearch({
    fileSystem: { readFile: async () => ({ contents: '' }) },
    index
  });
}

describe('BUG-API-028: findBestMatch tie-breaking is order-dependent', () => {

  it('same-depth locations produce different results depending on order', () => {
    const search = makeSearch();

    const locationsOrderA = [
      { path: '/project/src/moduleA/process.bpmn' },
      { path: '/project/src/moduleB/process.bpmn' }
    ];
    const locationsOrderB = [
      { path: '/project/src/moduleB/process.bpmn' },
      { path: '/project/src/moduleA/process.bpmn' }
    ];

    const currentFile = '/project/src/moduleC/current.bpmn';

    const resultA = search.findBestMatch(locationsOrderA, currentFile);
    const resultB = search.findBestMatch(locationsOrderB, currentFile);

    // Both moduleA and moduleB have the same commonPrefixLength with moduleC
    // (prefix = /project/src). The function should return the same result
    // regardless of input order, but because of strict > comparison,
    // it returns the first one encountered with the highest score.
    assert.equal(resultA.path, resultB.path,
      `findBestMatch should return the same result regardless of input order, ` +
      `but got '${resultA.path}' vs '${resultB.path}'`);
  });
});
