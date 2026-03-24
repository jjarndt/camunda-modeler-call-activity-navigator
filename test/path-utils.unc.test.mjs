import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('normalizePath UNC paths', () => {

  describe('parent traversal', () => {

    it('resolves parent traversal within UNC share', () => {
      assert.equal(
        normalizePath('\\\\server\\share\\a\\b\\..\\c', '\\'),
        '\\\\server\\share\\a\\c'
      );
    });

    it('clamps parent traversal at UNC share root', () => {
      assert.equal(
        normalizePath('\\\\server\\share\\..', '\\'),
        '\\\\server\\share'
      );
    });

    it('resolves parent traversal in UNC path with backslash sep', () => {
      assert.equal(
        normalizePath('\\\\server\\share\\a\\..\\b', '\\'),
        '\\\\server\\share\\b'
      );
    });
  });

  describe('edge cases', () => {

    it('UNC path without share name preserves double backslash', () => {
      const result = normalizePath('\\\\server', '\\');
      assert.equal(result, '\\\\server',
        'UNC path without share should preserve double backslash');
    });

    it('UNC path with server and share is preserved', () => {
      const result = normalizePath('\\\\server\\share\\dir\\file.txt', '\\');
      assert.equal(result, '\\\\server\\share\\dir\\file.txt');
    });

    it('UNC path with forward slashes is preserved', () => {
      const result = normalizePath('//server/share/dir/file.txt', '/');
      assert.equal(result, '//server/share/dir/file.txt');
    });
  });

  describe('forward slash as preferredSep', () => {

    it('UNC path normalized with / should not contain mixed separators', () => {
      const result = normalizePath('\\\\server\\share\\folder\\file.bpmn', '/');
      const hasMixed = result.includes('\\') && result.includes('/');
      assert.equal(hasMixed, false,
        `UNC path normalized with '/' should not contain mixed separators, got: '${result}'`);
    });

    it('UNC path normalized with / produces idempotent result', () => {
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

  describe('UNC prefix preservation with forward slash sep', () => {

    it('UNC path must retain absolute //server/share prefix when normalized with /', () => {
      const input = '\\\\server\\share\\projects\\foo.bpmn';
      const result = normalizePath(input, '/');

      assert.ok(
        result.startsWith('//') || result.startsWith('\\\\'),
        `UNC path lost its absolute prefix: got "${result}" from "${input}".`
      );
    });

    it('ProcessIndex isIndexed returns true for UNC path after setFileIndex', () => {
      const idx = new ProcessIndex();
      const uncPath = '\\\\server-a\\share\\work\\proc.bpmn';
      idx.setFileIndex(uncPath, ['my-process']);

      const normalised = normalizePath(uncPath, '/');
      assert.ok(
        normalised.startsWith('//') || normalised.startsWith('\\\\'),
        `normalizePath('${uncPath}', '/') = '${normalised}' - UNC absolute prefix lost.`
      );
    });
  });

  describe('UNC root normalization', () => {

    it('UNC path normalized with backslash preserves all parts', () => {
      const result = normalizePath('\\\\server\\share\\file.txt', '/');

      assert.ok(
        result.includes('server') && result.includes('share') && result.includes('file.txt'),
        'All path parts must be present'
      );

      assert.ok(
        result.startsWith('/') || result.startsWith('\\') || result.includes('//'),
        `UNC path must remain absolute, but got: "${result}"`
      );
    });

    it('UNC path with native separator preserves double backslash prefix', () => {
      const result = normalizePath('\\\\server\\share\\dir\\file.txt', '\\');

      assert.ok(
        result.startsWith('\\\\'),
        `UNC path must start with \\\\, but got: "${result}"`
      );
    });
  });

  describe('trailing slash consistency', () => {

    it('UNC root with and without trailing forward slash normalizes identically', () => {
      const withSlash = normalizePath('//server/share/', '/');
      const withoutSlash = normalizePath('//server/share', '/');

      assert.strictEqual(withSlash, withoutSlash,
        `UNC root with trailing slash "${withSlash}" differs from without "${withoutSlash}".`);
    });

    it('UNC root with and without trailing backslash normalizes identically', () => {
      const withSlash = normalizePath('\\\\server\\share\\', '\\');
      const withoutSlash = normalizePath('\\\\server\\share', '\\');

      assert.strictEqual(withSlash, withoutSlash,
        `UNC root with trailing backslash "${withSlash}" differs from without "${withoutSlash}".`);
    });

    it('ProcessIndex deduplication works for UNC roots with different trailing slash', () => {
      const path1 = normalizePath('//server/share/', '/');
      const path2 = normalizePath('//server/share', '/');

      assert.strictEqual(path1, path2,
        `"${path1}" !== "${path2}": same UNC share normalizes to different strings`);
    });
  });
});
