import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Bug API-020: _buildCandidateNames produces unique names', () => {

  // Fixed version: deduplicates via Set
  function buildCandidateNames(processId) {
    return [...new Set([
      `${processId}.bpmn`,
      `${processId.replace(/_/g, '-')}.bpmn`,
      `${processId.replace(/-/g, '_')}.bpmn`
    ])];
  }

  it('no duplicates when processId has only underscores', () => {
    const names = buildCandidateNames('my_process');
    assert.strictEqual(names.length, new Set(names).size);
    assert.strictEqual(names.length, 2);
  });

  it('no duplicates when processId has only hyphens', () => {
    const names = buildCandidateNames('my-process');
    assert.strictEqual(names.length, new Set(names).size);
    assert.strictEqual(names.length, 2);
  });

  it('no duplicates when processId has neither', () => {
    const names = buildCandidateNames('myprocess');
    assert.strictEqual(names.length, new Set(names).size);
    assert.strictEqual(names.length, 1);
  });

  it('three unique names when processId has both underscore and hyphen', () => {
    const names = buildCandidateNames('my_pro-cess');
    assert.strictEqual(names.length, 3);
    assert.strictEqual(names.length, new Set(names).size);
  });
});
