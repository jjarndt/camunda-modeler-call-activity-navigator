/**
 * BUG-API-006: searchInKnownFiles accepts knownFiles as Set AND Array
 *
 * The code does: for (const filePath of (knownFiles ?? []))
 * Both Set and Array are iterable, so both should work.
 * But: the check `knownFiles ?? []` only covers null/undefined,
 * not non-iterable objects like plain numbers or objects.
 *
 * Also verify: does Set work correctly (no duplicate processing)?
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

const BPMN = id => `<bpmn:process id="${id}" isExecutable="true"/>`;

function createMockFS(files) {
  return {
    readFile: async (path) => {
      if (files.has(path)) return { contents: files.get(path) };
      throw new Error(`File not found: ${path}`);
    }
  };
}

describe('BUG-API-006: searchInKnownFiles with Set vs Array', () => {

  it('works correctly when knownFiles is a Set', async () => {
    const files = new Map([
      ['/proj/current.bpmn', BPMN('MyProcess')],
      ['/proj/target.bpmn', BPMN('MyProcess')]
    ]);
    const fileSystem = createMockFS(files);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    await search.indexFile('/proj/current.bpmn');

    const knownFiles = new Set(['/proj/current.bpmn', '/proj/target.bpmn']);
    const result = await search.searchInKnownFiles('MyProcess', '/proj/current.bpmn', knownFiles);

    assert.equal(result, '/proj/target.bpmn',
      'should work with Set input and return target path');
  });

  it('works correctly when knownFiles is an Array', async () => {
    const files = new Map([
      ['/proj/current.bpmn', BPMN('MyProcess')],
      ['/proj/target.bpmn', BPMN('MyProcess')]
    ]);
    const fileSystem = createMockFS(files);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    await search.indexFile('/proj/current.bpmn');

    const result = await search.searchInKnownFiles(
      'MyProcess',
      '/proj/current.bpmn',
      ['/proj/current.bpmn', '/proj/target.bpmn']
    );

    assert.equal(result, '/proj/target.bpmn',
      'should work with Array input');
  });

  it('throws when knownFiles is a non-iterable (plain object)', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: {}, index });

    await assert.rejects(
      () => search.searchInKnownFiles('MyProcess', '/proj/current.bpmn', { foo: 'bar' }),
      TypeError,
      'should throw when knownFiles is not iterable'
    );
  });

  it('throws when knownFiles is a number', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: {}, index });

    await assert.rejects(
      () => search.searchInKnownFiles('MyProcess', '/proj/current.bpmn', 42),
      TypeError,
      'should throw when knownFiles is a number'
    );
  });

});
