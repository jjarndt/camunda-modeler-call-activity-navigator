import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('resolves long chain of parent traversals correctly', () => {
    assert.equal(
      normalizePath('/a/b/c/d/e/../../../../f', '/'),
      '/a/f'
    );

    assert.equal(
      normalizePath('a/b/c/../../../../x', '/'),
      '../x'
    );
  });
});
