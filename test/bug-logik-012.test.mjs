/**
 * Bug-Logik-012: BPMN_ROOT_PATTERN fails when "processes" or "bpmn" is the
 * first directory in an absolute path.
 *
 * The pattern /(.+?[\\/](?:processes|bpmn))[\\/]/ requires at least one
 * character before the directory separator via .+?, so paths like
 * /processes/file.bpmn never match. The .+? consumes "/" which leaves
 * nothing for [\\/] to match against.
 *
 * This means _searchInSiblingDirs silently returns null for any file
 * directly under a /processes/ root directory, skipping sibling search
 * entirely.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BPMN_ROOT_PATTERN = /(.*[\\/]?(?:processes|bpmn))[\\/]/;

describe('BUG-LOGIK-012: BPMN_ROOT_PATTERN fails for root-level processes directory', () => {

  it('should match /processes/ at the root of an absolute path', () => {
    const path = '/processes/myprocess.bpmn';
    const match = path.match(BPMN_ROOT_PATTERN);
    assert.ok(
      match,
      `Pattern did not match "${path}". Sibling search will be skipped for files directly under /processes/.`
    );
  });

  it('should match /bpmn/ at the root of an absolute path', () => {
    const path = '/bpmn/myprocess.bpmn';
    const match = path.match(BPMN_ROOT_PATTERN);
    assert.ok(
      match,
      `Pattern did not match "${path}". Sibling search will be skipped for files directly under /bpmn/.`
    );
  });
});
