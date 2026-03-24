/**
 * SEC-012: Null byte injection in file paths
 *
 * Null bytes (\0) in file paths can cause path truncation in some
 * OS-level APIs. If normalizePath does not strip or reject null bytes,
 * a path like "/safe/dir/file.bpmn\0../../etc/passwd" could be
 * truncated to "/safe/dir/file.bpmn" at the OS level but processed
 * differently by JavaScript string operations.
 *
 * Additionally, null bytes in processId could bypass VALID_PROCESS_ID
 * regex if not properly handled.
 *
 * CWE-158: Improper Neutralization of Null Byte or NUL Character
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('SEC-012: Null byte injection in paths', () => {

  it('normalizePath does not strip null bytes from path', () => {
    const malicious = '/safe/dir/file.bpmn\0/../../etc/passwd';
    const normalized = normalizePath(malicious, '/');

    // If null bytes are preserved, the path contains them
    const hasNullByte = normalized.includes('\0');

    if (hasNullByte) {
      assert.fail(
        `normalizePath preserves null bytes: "${normalized.replace(/\0/g, '\\0')}" - ` +
        'this could cause path truncation at OS level (CWE-158)'
      );
    }
  });

  it('normalizePath does not strip control characters from path', () => {
    // Various control characters that could cause issues
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
        `normalizePath preserves control characters: ${failed.join(', ')} - ` +
        'these could cause unexpected behavior in file operations'
      );
    }
  });

  it('ProcessIndex allows null bytes in file paths', () => {
    const index = new ProcessIndex();
    const maliciousPath = '/safe/dir/file.bpmn\0/../../etc/passwd';

    // This should either reject the path or sanitize it
    index.setFileIndex(maliciousPath, ['myProcess']);

    const locations = index.getLocations('myProcess');
    const storedPath = locations[0]?.path;

    if (storedPath && storedPath.includes('\0')) {
      assert.fail(
        `ProcessIndex stores paths with null bytes: "${storedPath.replace(/\0/g, '\\0')}" - ` +
        'could cause path truncation attacks'
      );
    }
  });

  it('VALID_PROCESS_ID regex rejects null bytes', () => {
    const VALID_PROCESS_ID = /^[a-zA-Z0-9_\-.:]+$/;
    const withNull = 'process\0id';

    // The regex should reject this, but let's verify
    assert.strictEqual(VALID_PROCESS_ID.test(withNull), false,
      'Null byte in processId should be rejected by VALID_PROCESS_ID');
  });
});
