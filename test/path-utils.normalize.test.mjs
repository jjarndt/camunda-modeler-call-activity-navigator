import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath, getPathSeparator } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('normalizePath edge cases', () => {

  describe('identity - already-clean paths', () => {

    it('returns already-clean paths unchanged', () => {
      assert.equal(normalizePath('/usr/local/bin', '/'), '/usr/local/bin');
      assert.equal(normalizePath('C:\\Windows\\System32', '\\'), 'C:\\Windows\\System32');
      assert.equal(normalizePath('relative/path/here', '/'), 'relative/path/here');
      assert.equal(normalizePath('file.txt', '/'), 'file.txt');
    });
  });

  describe('relative paths', () => {

    it('handles purely relative paths without any root', () => {
      assert.equal(normalizePath('a/b/c', '/'), 'a/b/c');
      assert.equal(normalizePath('../a/b', '/'), '../a/b');
      assert.equal(normalizePath('../../a', '/'), '../../a');
      assert.equal(normalizePath('./a/./b', '/'), 'a/b');
      assert.equal(normalizePath('a', '/'), 'a');
    });
  });

  describe('root-only paths', () => {

    it('handles root-only paths', () => {
      assert.equal(normalizePath('/', '/'), '/');
      assert.equal(normalizePath('C:\\', '\\'), 'C:\\');
      assert.equal(normalizePath('//', '/'), '/');
    });
  });

  describe('empty segments', () => {

    it('eliminates empty segments from triple separators', () => {
      assert.equal(normalizePath('/a///b////c', '/'), '/a/b/c');
      assert.equal(normalizePath('C:\\\\\\a\\\\b', '\\'), 'C:\\a\\b');
    });
  });

  describe('long parent traversal chains', () => {

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

  describe('mixed separators', () => {

    it('normalizes mixed forward and backslashes', () => {
      assert.equal(
        normalizePath('C:\\Users/mixed\\path/file', '\\'),
        'C:\\Users\\mixed\\path\\file'
      );
      assert.equal(
        normalizePath('/unix/path\\with\\backslash', '/'),
        '/unix/path/with/backslash'
      );
    });
  });

  describe('cross-platform separator forcing', () => {

    it('normalizes backslashes to forward slashes when sep is forced to /', () => {
      const result = normalizePath('C:\\Users\\me\\file', '/');
      assert.equal(result, 'C:/Users/me/file');
    });
  });

  describe('current-directory normalization', () => {

    it('returns "." for input "."', () => {
      const result = normalizePath('.');
      assert.equal(result, '.', `Expected "." but got "${result}"`);
    });

    it('returns "." for input "./"', () => {
      const result = normalizePath('./');
      assert.equal(result, '.', `Expected "." but got "${result}"`);
    });

    it('returns "." for input "./."', () => {
      const result = normalizePath('./.');
      assert.equal(result, '.', `Expected "." but got "${result}"`);
    });
  });

  describe('falsy and non-string input', () => {

    it('normalizePath("") returns empty string', () => {
      const result = normalizePath('', '/');
      assert.equal(result, '', 'empty string is returned unchanged');
    });

    it('normalizePath(null) returns a string', () => {
      const result = normalizePath(null, '/');
      assert.equal(typeof result, 'string',
        'normalizePath(null) should return a string, not null');
    });

    it('normalizePath(undefined) returns a string', () => {
      const result = normalizePath(undefined, '/');
      assert.equal(typeof result, 'string',
        'normalizePath(undefined) should return a string, not undefined');
    });

    it('normalizePath(0) returns a string', () => {
      const result = normalizePath(0, '/');
      assert.equal(typeof result, 'string',
        'normalizePath(0) should return a string');
    });

    it('does not throw when inputPath is a number', () => {
      assert.doesNotThrow(() => {
        normalizePath(42);
      }, 'normalizePath(42) must not throw');
    });

    it('does not throw when inputPath is a plain object', () => {
      assert.doesNotThrow(() => {
        normalizePath({ path: '/foo/bar' });
      }, 'normalizePath({}) must not throw');
    });
  });

  describe('ProcessIndex with falsy normalizePath results', () => {

    it('ProcessIndex.isIndexed("") returns false for empty string', () => {
      const index = new ProcessIndex();
      index.setFileIndex('/some/file.bpmn', ['myProcess']);
      const result = index.isIndexed('');
      assert.equal(result, false,
        'isIndexed("") must return false');
    });

    it('ProcessIndex.isIndexed("") returns false even after setFileIndex("", ...)', () => {
      const index = new ProcessIndex();
      index.setFileIndex('', ['someProcess']);
      const result = index.isIndexed('');
      assert.equal(result, false,
        'isIndexed("") must return false - empty string is not a valid file path');
    });
  });

  describe('Windows drive paths', () => {

    it('handles Windows drive-relative path (no backslash after colon)', () => {
      assert.equal(normalizePath('C:a\\b', '\\'), 'C:a\\b');
      assert.equal(normalizePath('C:', '\\'), 'C:');
    });

    it('handles Windows relative path without drive letter', () => {
      assert.equal(normalizePath('a\\b\\..\\c', '\\'), 'a\\c');
      assert.equal(normalizePath('a\\.\\b\\\\c', '\\'), 'a\\b\\c');
      assert.equal(normalizePath('a\\b\\c\\..\\..', '\\'), 'a');
    });

    it('preserves C:foo as relative (not turn into C:\\foo)', () => {
      const result = normalizePath('C:foo', '\\');
      assert.equal(result, 'C:foo',
        `Expected "C:foo" but got "${result}". Relative drive path was incorrectly made absolute.`);
    });

    it('preserves C:dir\\file as relative', () => {
      const result = normalizePath('C:dir\\file', '\\');
      assert.equal(result, 'C:dir\\file',
        `Expected "C:dir\\file" but got "${result}".`);
    });

    it('keeps C:\\foo as absolute', () => {
      const result = normalizePath('C:\\foo', '\\');
      assert.equal(result, 'C:\\foo');
    });

    it('C:..\\file.txt should preserve ".." for drive-relative path', () => {
      const result = normalizePath('C:..\\file.txt', '\\');
      assert.equal(result, 'C:..\\file.txt',
        '".." in drive-relative path must not be eaten');
    });

    it('C:\\..\\ should not go above drive root', () => {
      const result = normalizePath('C:\\..\\file.txt', '\\');
      assert.equal(result, 'C:\\file.txt',
        'Absolute path should eat ".." at root');
    });
  });

  describe('drive letter case normalization', () => {

    it('normalizes drive letter case consistently', () => {
      const lower = normalizePath('c:\\foo\\bar.bpmn', '/');
      const upper = normalizePath('C:\\foo\\bar.bpmn', '/');

      assert.strictEqual(lower, upper,
        `Drive letter case causes different normalized paths: "${lower}" vs "${upper}"`);
    });

    it('ProcessIndex.removeFile works when drive letter case differs', () => {
      const index = new ProcessIndex();
      index.setFileIndex('c:\\project\\file.bpmn', ['MyProcess']);

      const before = index.getLocations('MyProcess');
      assert.strictEqual(before.length, 1, 'Should have 1 location after setFileIndex');

      index.removeFile('C:\\project\\file.bpmn');

      const after = index.getLocations('MyProcess');
      assert.strictEqual(after.length, 0,
        `removeFile with different drive letter case failed. Still has ${after.length} location(s).`);
    });

    it('ProcessIndex does not create duplicates for different drive letter case', () => {
      const index = new ProcessIndex();
      index.setFileIndex('c:\\file.bpmn', ['Process1']);
      index.setFileIndex('C:\\file.bpmn', ['Process1']);

      const locations = index.getLocations('Process1');
      assert.strictEqual(locations.length, 1,
        `Same file with different drive letter case created ${locations.length} entries instead of 1.`);
    });
  });

  describe('Unix path with Windows separator', () => {

    it('Unix absolute path with backslash sep does not produce mixed separators', () => {
      const result = normalizePath('/foo/bar', '\\');
      const hasMixedSeparators = result.includes('/') && result.includes('\\');
      assert.equal(hasMixedSeparators, false,
        `normalizePath('/foo/bar', '\\\\') returned '${result}' which mixes / and \\\\ separators`);
    });

    it('Unix absolute path with backslash sep does not mix root styles', () => {
      const result = normalizePath('/usr/local/bin', '\\');
      const startsUnix = result.startsWith('/');
      const hasBackslash = result.includes('\\');
      const inconsistent = startsUnix && hasBackslash;
      assert.equal(inconsistent, false,
        `Result '${result}' has unix root but windows separators`);
    });

    it('Unix root is preserved when preferredSep is backslash', () => {
      const result = normalizePath('/', '\\');
      assert.notEqual(result, '.',
        `normalizePath('/', '\\\\') returned '.' - the root path was lost`);
    });

    it('Unix absolute path segments are preserved with backslash sep', () => {
      const result = normalizePath('/foo/bar', '\\');
      assert.ok(
        result.startsWith('/') || result.startsWith('\\'),
        `normalizePath('/foo/bar', '\\\\') returned "${result}" - lost the root prefix`
      );
    });
  });

  describe('leading space in absolute path', () => {

    it('normalizePath(" /foo/bar") should equal normalizePath("/foo/bar")', () => {
      const withLeadingSpace = normalizePath(' /foo/bar');
      const clean = normalizePath('/foo/bar');

      assert.equal(withLeadingSpace, clean,
        `Leading space causes the absolute path to be treated as relative.`);
    });

    it('ProcessIndex: leading-space and clean path should match via isIndexed', () => {
      const idx = new ProcessIndex();
      idx.setFileIndex(' /projects/my-process.bpmn', ['proc1']);

      const found = idx.isIndexed('/projects/my-process.bpmn');
      assert.equal(found, true,
        `Same logical file stored under different keys due to unstripped leading space.`);
    });

    it('ProcessIndex: no duplicate entries for paths with and without leading space', () => {
      const idx = new ProcessIndex();
      idx.setFileIndex('/foo/bar.bpmn', ['proc1']);
      idx.setFileIndex(' /foo/bar.bpmn', ['proc1']);

      const locs = idx.getLocations('proc1');
      assert.equal(locs.length, 1,
        `ProcessIndex created ${locs.length} location entries for the same logical file.`);
    });
  });

  describe('null bytes and control characters', () => {

    it('normalizePath does not preserve null bytes in path', () => {
      const malicious = '/safe/dir/file.bpmn\0/../../etc/passwd';
      const normalized = normalizePath(malicious, '/');
      const hasNullByte = normalized.includes('\0');

      if (hasNullByte) {
        assert.fail(
          `normalizePath preserves null bytes: "${normalized.replace(/\0/g, '\\0')}" (CWE-158)`
        );
      }
    });

    it('normalizePath does not preserve control characters in path', () => {
      const controlChars = ['\x01', '\x02', '\x7f', '\x1b'];
      const failed = [];

      for (const ch of controlChars) {
        const path = `/safe/dir${ch}/file.bpmn`;
        const normalized = normalizePath(path, '/');
        if (normalized.includes(ch)) {
          failed.push(`\\x${ch.charCodeAt(0).toString(16).padStart(2, '0')}`);
        }
      }

      if (failed.length > 0) {
        assert.fail(
          `normalizePath preserves control characters: ${failed.join(', ')}`
        );
      }
    });

    it('normalizePath with NUL byte does not crash', () => {
      const input = '/project/\x00etc/passwd';
      let result;
      assert.doesNotThrow(() => {
        result = normalizePath(input, '/');
      });
      if (result) {
        assert.ok(!result.includes('\x00'), 'Result must not contain NUL bytes');
      }
    });

    it('normalizePath with control characters in path does not crash', () => {
      const input = '/project/\x01\x02\x1ffile.bpmn';
      let result;
      assert.doesNotThrow(() => {
        result = normalizePath(input, '/');
      });
      if (result) {
        assert.ok(!/[\x00-\x1f\x7f]/.test(result), 'Result should not contain control characters');
      }
    });

    it('normalizePath with very long path segment does not crash', () => {
      const longSegment = 'a'.repeat(100000);
      const input = `/project/${longSegment}/file.bpmn`;
      assert.doesNotThrow(() => {
        normalizePath(input, '/');
      });
    });

    it('ProcessIndex rejects paths with null bytes', () => {
      const index = new ProcessIndex();
      const maliciousPath = '/safe/dir/file.bpmn\0/../../etc/passwd';

      index.setFileIndex(maliciousPath, ['myProcess']);

      const locations = index.getLocations('myProcess');
      const storedPath = locations[0]?.path;

      if (storedPath && storedPath.includes('\0')) {
        assert.fail(
          `ProcessIndex stores paths with null bytes: "${storedPath.replace(/\0/g, '\\0')}"`
        );
      }
    });

    it('VALID_PROCESS_ID regex rejects null bytes', () => {
      const VALID_PROCESS_ID = /^[a-zA-Z0-9_\-.:]+$/;
      const withNull = 'process\0id';
      assert.strictEqual(VALID_PROCESS_ID.test(withNull), false,
        'Null byte in processId should be rejected by VALID_PROCESS_ID');
    });
  });

  describe('control character path traversal security', () => {

    it('silently drops ".." with control chars (security feature)', () => {
      const result = normalizePath('/a/b/..\x00', '/');
      assert.equal(result, '/a/b',
        'Control-char-injected ".." should be silently dropped');
    });

    it('clean ".." without control chars works correctly', () => {
      const result = normalizePath('/a/b/..', '/');
      assert.equal(result, '/a', 'Baseline: clean ".." should navigate up');
    });

    it('control char \\x01 between dots does not create traversal', () => {
      const path = '/safe/dir/.\x01./etc/passwd';
      const result = normalizePath(path, '/');
      if (result === '/safe/etc/passwd') {
        assert.fail(
          `Control character stripping creates path traversal! Input -> Output: ${result} (CWE-22)`
        );
      }
    });

    it('control char \\x02 between dots does not create traversal', () => {
      const path = '/a/.\x02./b';
      const result = normalizePath(path, '/');
      if (result === '/b') {
        assert.fail(`".<\\x02>." became ".." after stripping: ${result}`);
      }
    });

    it('DEL char \\x7f between dots does not create traversal', () => {
      const path = '/a/.\x7f./b';
      const result = normalizePath(path, '/');
      if (result === '/b') {
        assert.fail(`".<\\x7f>." became ".." after stripping: ${result}`);
      }
    });

    it('newline between dots does not create traversal', () => {
      const path = '/a/.\x0a./b';
      const result = normalizePath(path, '/');
      if (result === '/b') {
        assert.fail(`".<\\x0a>." became ".." after stripping: ${result}`);
      }
    });

    it('carriage return between dots does not create traversal', () => {
      const path = '/a/.\x0d./b';
      const result = normalizePath(path, '/');
      if (result === '/b') {
        assert.fail(`".<\\x0d>." became ".." after stripping: ${result}`);
      }
    });

    it('tab between dots does not create traversal', () => {
      const path = '/a/.\x09./b';
      const result = normalizePath(path, '/');
      if (result === '/b') {
        assert.fail(`".<\\x09>." became ".." after stripping: ${result}`);
      }
    });

    it('multiple control chars do not enable multi-level traversal', () => {
      const path = '/a/b/c/.\x01./.\x01./etc/passwd';
      const result = normalizePath(path, '/');
      if (result === '/a/etc/passwd') {
        assert.fail(`Multi-level traversal via control chars: ${result}`);
      }
    });

    it('Windows path with control char does not create traversal', () => {
      const path = 'C:\\safe\\dir\\.\x01.\\windows\\system32';
      const result = normalizePath(path, '\\');
      if (result === 'C:\\safe\\windows\\system32') {
        assert.fail(`Windows control char traversal: ${result}`);
      }
    });

    it('URL-encoded separators are NOT decoded (safe)', () => {
      const path = '/safe/dir/%2F..%2F..%2Fetc%2Fpasswd';
      const result = normalizePath(path, '/');
      assert.ok(!result.includes('etc/passwd'),
        `URL-encoded separators should NOT be decoded, got: ${result}`);
    });
  });
});

describe('getPathSeparator edge cases', () => {

  it('always returns forward slash for paths without backslash', () => {
    assert.equal(getPathSeparator('/home/user/file.bpmn'), '/');
    assert.equal(getPathSeparator('relative/path/file.bpmn'), '/');
    assert.equal(getPathSeparator('file.bpmn'), '/');
    assert.equal(getPathSeparator('http://example.com/path'), '/');
    assert.equal(getPathSeparator('C:/Windows/posix/style'), '/');
  });

  it('handles various edge cases', () => {
    assert.equal(getPathSeparator('file.bpmn'), '/');
    assert.equal(getPathSeparator('\\\\server\\share'), '\\');
    assert.equal(getPathSeparator('C:\\'), '\\');
    assert.equal(getPathSeparator('/'), '/');
    assert.equal(getPathSeparator('a/b\\c'), '\\');
  });

  it('does not throw when filePath is a number', () => {
    assert.doesNotThrow(() => {
      getPathSeparator(42);
    }, 'getPathSeparator(42) must not throw');
  });

  it('does not throw when filePath is a plain object', () => {
    assert.doesNotThrow(() => {
      getPathSeparator({ path: '/foo/bar' });
    }, 'getPathSeparator({}) must not throw');
  });
});
