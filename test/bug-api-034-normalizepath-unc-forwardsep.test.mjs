/**
 * BUG-API-034: normalizePath with UNC path and '/' as preferredSep
 * may produce inconsistent results. UNC paths start with \\server\share
 * but if preferredSep is '/', the root portion should be converted.
 *
 * ProcessIndex always normalizes with '/', so Windows UNC paths
 * that enter the system need consistent handling.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-API-034: normalizePath UNC path with forward slash preferredSep', () => {

  it('UNC path with / preferredSep should not mix separators', () => {
    const result = normalizePath('\\\\server\\share\\folder\\file.bpmn', '/');
    // The root is \\server\share, body is folder\file.bpmn
    // With preferredSep '/', the root should be converted to //server/share
    // and body to folder/file.bpmn
    const hasMixed = result.includes('\\') && result.includes('/');
    assert.equal(hasMixed, false,
      `UNC path normalized with '/' should not contain mixed separators, got: '${result}'`);
  });

  it('UNC path with / preferredSep produces idempotent result', () => {
    const first = normalizePath('\\\\server\\share\\folder\\file.bpmn', '/');
    const second = normalizePath(first, '/');
    assert.equal(first, second,
      `normalizePath should be idempotent: first='${first}', second='${second}'`);
  });

  it('drive letter path with / preferredSep should not mix separators', () => {
    const result = normalizePath('C:\\Users\\test\\file.bpmn', '/');
    const hasMixed = result.includes('\\') && result.includes('/');
    assert.equal(hasMixed, false,
      `Drive letter path normalized with '/' should not mix separators, got: '${result}'`);
  });
});
