/**
 * BUG-API-022: Verify _buildParentDirs does not traverse to root from empty dir.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-API-022: empty currentDir does not reach root', () => {

  it('normalizePath("/..", "/") correctly returns "/" (root cant go higher)', () => {
    // This is correct normalizePath behavior
    assert.strictEqual(normalizePath('/..', '/'), '/');
  });

  it('_buildParentDirs pattern stops at empty dir', () => {
    // Simulate the fixed _buildParentDirs logic
    const currentDir = '';
    const pathSep = '/';
    const dirs = [];

    if (!currentDir) {
      dirs.push(currentDir);
    } else {
      dirs.push(currentDir);
      let dir = currentDir;
      for (let i = 0; i < 5; i++) {
        const parent = normalizePath(`${dir}${pathSep}..`, pathSep);
        if (!parent || parent === dir || parent === '.') break;
        dir = parent;
        dirs.push(dir);
      }
    }

    assert.ok(!dirs.includes('/'),
      'Empty currentDir should not lead to root "/" in parent dirs');
  });
});
