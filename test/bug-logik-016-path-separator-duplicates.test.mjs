import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-002: ProcessIndex duplicates with different separators', () => {

  it('should not create duplicate entries for backslash vs forward-slash paths', () => {
    const index = new ProcessIndex();

    index.setFileIndex('\\project\\file.bpmn', ['Process_A']);
    index.setFileIndex('/project/file.bpmn', ['Process_A']);

    const locations = index.getLocations('Process_A');
    assert.strictEqual(
      locations.length, 1,
      `Same file with different separators should produce 1 entry, got ${locations.length}: ${JSON.stringify(locations)}`
    );
  });

  it('should treat leading backslash as root like forward slash', () => {
    const index = new ProcessIndex();

    index.setFileIndex('\\project\\file.bpmn', ['Process_B']);

    const locations = index.getLocations('Process_B');
    assert.strictEqual(locations.length, 1);
    assert.strictEqual(locations[0].path, '/project/file.bpmn');
  });
});
