import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('extractProcessIds - quote handling', () => {

  it('extracts process ids wrapped in single quotes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id='SingleQuoted_1' isExecutable="true" />
</bpmn:definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['SingleQuoted_1']);
  });
});

describe('extractProcessIds - tag name boundary matching', () => {

  it('does not match <bpmn:processDefinition> as a process ID', () => {
    const xml = `<bpmn:definitions>
  <bpmn:processDefinition id="should-not-match"/>
  <bpmn:process id="real-id" isExecutable="true"/>
</bpmn:definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(!ids.includes('should-not-match'),
      '<bpmn:processDefinition id="..."> was incorrectly matched');
    assert.ok(ids.includes('real-id'));
  });
});

describe('ProcessIndex - empty path handling', () => {

  it('setFileIndex with empty path must not create location entries', () => {
    const idx = new ProcessIndex();
    idx.setFileIndex('', ['some-process']);
    const locs = idx.getLocations('some-process');
    assert.equal(locs.length, 0,
      `empty path created ${locs.length} location entry/entries`);
  });

  it('getLocations returns correct count when two files have same processId', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/a.bpmn', ['sharedProcess']);
    index.setFileIndex('/b.bpmn', ['sharedProcess']);

    const locations = index.getLocations('sharedProcess');
    assert.equal(locations.length, 2,
      'getLocations should return both files for a shared process ID');
  });
});
