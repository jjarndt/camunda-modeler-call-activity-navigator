import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeUrl } from '../client/update-check.mjs';

describe('BUG-005: isSafeUrl must reject URLs with embedded credentials', () => {

  it('should reject URLs with user:password@', () => {
    assert.strictEqual(
      isSafeUrl('https://user:password@github.com/repo/releases/tag/v1'),
      false,
      'URLs with embedded credentials must be rejected'
    );
  });

  it('should reject URLs with username only', () => {
    assert.strictEqual(
      isSafeUrl('https://user@github.com/repo/releases/tag/v1'),
      false,
      'URLs with embedded username must be rejected'
    );
  });

  it('should still accept valid GitHub URLs', () => {
    assert.strictEqual(
      isSafeUrl('https://github.com/jjarndt/camunda-modeler-call-activity-navigator/releases/tag/v1.2.1'),
      true
    );
  });
});
