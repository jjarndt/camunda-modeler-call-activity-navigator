import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../client/update-check.mjs';

describe('isNewerVersion', () => {
  it('handles versions with fewer than 3 segments', () => {
    assert.strictEqual(isNewerVersion('1', '2'), true);
    assert.strictEqual(isNewerVersion('1', '1'), false);
    assert.strictEqual(isNewerVersion('1.0', '1.1'), true);
    assert.strictEqual(isNewerVersion('2', '1.99.99'), false);
    assert.strictEqual(isNewerVersion('1.0.0', '1'), false);
  });
});
