/**
 * Bug-Finder-Logik-030: normalizePath with Windows drive letter without separator
 *
 * What does normalizePath("C:file.txt", "\\") produce?
 * extractRoot: drive match "C:", hasRootSep = false (no \ after C:).
 * root = "C:", rest = "file.txt".
 * parts = ["file.txt"]. normalized = ["file.txt"]. joined = "file.txt".
 * Line 98: return joined ? normalizedRoot + joined : normalizedRoot
 * = "C:" + "file.txt" = "C:file.txt"
 *
 * But "C:file.txt" in Windows means "file.txt relative to current directory on C:".
 * This is a valid Windows path, and normalizing it should preserve it as-is.
 * So "C:file.txt" -> "C:file.txt" is correct.
 *
 * What about "C:dir\\file.txt"?
 * root = "C:", hasRootSep = false, rest = "dir\\file.txt".
 * parts = ["dir", "file.txt"]. joined = "dir\\file.txt".
 * return "C:" + "dir\\file.txt" = "C:dir\\file.txt". Correct.
 *
 * What about "C:..\\file.txt"?
 * root = "C:", hasRootSep = false, rest = "..\\file.txt".
 * parts = ["..", "file.txt"].
 * part ".." -> rawPart === ".." -> normalized is empty, !root (root="C:" truthy) -> DON'T push.
 * So ".." is silently eaten. normalized = ["file.txt"]. joined = "file.txt".
 * return "C:file.txt".
 *
 * Is this correct? "C:..\\file.txt" means "go up one dir from current dir on C: and find file.txt".
 * Normalizing away the ".." loses that semantics. But for an absolute path context,
 * you can't go above the drive root, so this might be intentional.
 *
 * Actually, "C:" without a root separator IS a relative path (relative to current dir on C:).
 * So ".." should be preserved. This is a bug: the code treats root="C:" as
 * a truthy root and prevents ".." from being pushed.
 *
 * For absolute "C:\\..", root = "C:", hasRootSep = true. ".." can't go above root. Correct.
 * For relative "C:..", root = "C:", hasRootSep = false. ".." SHOULD be preserved
 * (like "C:..\\file.txt" -> navigate up) but isn't. Bug.
 *
 * However, this is an extremely obscure Windows path format. Let me test it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-FINDER-LOGIK-030: normalizePath Windows drive-relative paths', () => {

  it('C:dir\\file.txt should be preserved as-is', () => {
    assert.equal(normalizePath('C:dir\\file.txt', '\\'), 'C:dir\\file.txt');
  });

  it('C:\\dir\\file.txt normalizes correctly', () => {
    assert.equal(normalizePath('C:\\dir\\file.txt', '\\'), 'C:\\dir\\file.txt');
  });

  it('C:..\\file.txt should preserve ".." for drive-relative path', () => {
    // C: without separator is drive-relative. ".." should be preserved.
    const result = normalizePath('C:..\\file.txt', '\\');
    assert.equal(result, 'C:..\\file.txt',
      'BUG: ".." in drive-relative path is eaten because root "C:" is truthy');
  });

  it('C:\\..\\ should not go above drive root', () => {
    // C:\..\ is absolute. Can't go above C:\.
    const result = normalizePath('C:\\..\\file.txt', '\\');
    assert.equal(result, 'C:\\file.txt',
      'Absolute path should eat ".." at root');
  });
});
