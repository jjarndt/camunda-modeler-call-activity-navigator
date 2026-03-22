/**
 * SEC-005: Path Traversal via processId containing ".." segments
 *
 * VALID_PROCESS_ID = /^[a-zA-Z0-9_\-.:]+$/ allows dots.
 * The processId ".." passes validation, and _buildCandidateNames creates
 * "...bpmn" (three dots + bpmn) - which is just an unusual filename, not traversal.
 *
 * However, processId "a" combined with _buildParentDirs traversal walks up 5 levels.
 * This is by design (searching parent directories), but with a processId containing
 * dots, the candidatePath could resolve unexpectedly.
 *
 * Key insight: The real path traversal risk is that _buildParentDirs already
 * traverses UP TO 5 parent directories regardless of processId content.
 * Combined with processId containing ".", the normalized path could potentially
 * escape the project root.
 *
 * CWE-22: Path Traversal
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath, getPathSeparator } from '../client/path-utils.mjs';

const VALID_PROCESS_ID = /^[a-zA-Z0-9_\-.:]+$/;

function buildCandidateNames(processId) {
  return [
    `${processId}.bpmn`,
    `${processId.replace(/_/g, '-')}.bpmn`,
    `${processId.replace(/-/g, '_')}.bpmn`
  ];
}

function buildParentDirs(currentDir, pathSep, maxLevels) {
  const dirs = [currentDir];
  let dir = currentDir;
  for (let i = 0; i < maxLevels; i++) {
    dir = `${dir}${pathSep}..`;
    dirs.push(dir);
  }
  return dirs;
}

describe('SEC-005: _tryRelativePaths escapes project boundary', () => {

  it('_buildParentDirs with 5 levels escapes shallow project trees', () => {
    // User file is at /home/user/project/processes/main.bpmn
    // currentDir = /home/user/project/processes
    // maxLevels = 5 means we search:
    //   /home/user/project/processes
    //   /home/user/project/processes/..  -> /home/user/project
    //   /home/user/project/processes/../.. -> /home/user
    //   /home/user/project/processes/../../.. -> /home
    //   /home/user/project/processes/../../../.. -> /
    //   /home/user/project/processes/../../../../.. -> / (can't go higher)

    const currentDir = '/home/user/project/processes';
    const sep = '/';
    const parentDirs = buildParentDirs(currentDir, sep, 5);
    const processId = 'secret';
    const candidates = buildCandidateNames(processId);

    // The candidate paths searched include:
    const searchedPaths = [];
    for (const dir of parentDirs) {
      for (const name of candidates) {
        searchedPaths.push(normalizePath(`${dir}${sep}${name}`, sep));
      }
    }

    // Verify that paths OUTSIDE the project tree are searched
    const outsideProject = searchedPaths.filter(p => !p.startsWith('/home/user/project'));

    assert.ok(
      outsideProject.length > 0,
      `Expected some paths outside /home/user/project, but all paths are within: ${JSON.stringify(searchedPaths)}`
    );

    // These outside-project paths are attempted via fileSystem.readFile
    // If a file named "secret.bpmn" exists in /home/user or /home or /,
    // it would be opened. This is a path traversal beyond the project boundary.
    assert.ok(
      outsideProject.some(p => p === '/home/user/secret.bpmn' || p === '/home/secret.bpmn' || p === '/secret.bpmn'),
      `Expected to find paths like /home/user/secret.bpmn in: ${JSON.stringify(outsideProject)}`
    );
  });

  it('Windows drive root reached from shallow project', () => {
    const currentDir = 'C:\\Users\\project\\processes';
    const sep = '\\';
    const parentDirs = buildParentDirs(currentDir, sep, 5);
    const candidates = buildCandidateNames('secret');

    const searchedPaths = [];
    for (const dir of parentDirs) {
      for (const name of candidates) {
        searchedPaths.push(normalizePath(`${dir}${sep}${name}`, sep));
      }
    }

    // Should reach C:\ root
    const atRoot = searchedPaths.filter(p => p.match(/^C:\\[^\\]+\.bpmn$/));
    assert.ok(
      atRoot.length > 0,
      `Expected some paths at C:\\ root, but got: ${JSON.stringify(searchedPaths)}`
    );
  });

  it('VALID_PROCESS_ID allows ".." which becomes "...bpmn" filename', () => {
    assert.equal(VALID_PROCESS_ID.test('..'), true, '".. " passes validation');
    const candidates = buildCandidateNames('..');
    // "...bpmn" is a valid filename on all OS, not a traversal
    assert.equal(candidates[0], '...bpmn');
  });
});
