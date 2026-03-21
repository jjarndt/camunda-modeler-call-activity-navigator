import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../client/update-check.mjs';

describe('isNewerVersion', () => {
  it('correctly handles large version jumps and zero versions', () => {
    assert.strictEqual(isNewerVersion('0.0.1', '1.0.0'), true, 'major jump from 0');
    assert.strictEqual(isNewerVersion('0.0.0', '0.0.1'), true, 'minimal increment');
    assert.strictEqual(isNewerVersion('99.99.99', '100.0.0'), true, 'large numbers');
    assert.strictEqual(isNewerVersion('1.0.0', '0.99.99'), false, 'major downgrade despite high minor/patch');
    assert.strictEqual(isNewerVersion('0.0.0', '0.0.0'), false, 'both zero');
  });
});
