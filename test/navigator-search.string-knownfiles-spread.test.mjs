/**
 * BUG-API-NEW-002: searchInKnownFiles accepts a string for knownFiles parameter.
 *
 * The spread operator [...(knownFiles ?? [])] on line 97 iterates over the
 * value. When knownFiles is a string (not an array or Set), the spread
 * operator splits it into individual characters, each treated as a file path.
 *
 * This means searchInKnownFiles("/proj/current.bpmn", "currentFile", "/proj/target.bpmn")
 * would spread "/proj/target.bpmn" into ['/', 'p', 'r', 'o', 'j', ...] and try
 * to index each single character as a file path.
 *
 * The isValidPath check filters out single characters that are just whitespace,
 * but '/', 'p', etc. pass the check.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-NEW-002: searchInKnownFiles spreads string into characters', () => {

  it('passing a string as knownFiles causes character-by-character iteration', async () => {
    const index = new ProcessIndex();
    const readCalls = [];
    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async (path) => {
          readCalls.push(path);
          return { contents: '' };
        }
      },
      index
    });

    // Pass a file path STRING instead of an Array
    await search.searchInKnownFiles(
      'MyProcess',
      '/proj/current.bpmn',
      '/proj/target.bpmn'  // string, not ['/proj/target.bpmn']
    );

    // FIX: string is now wrapped in array, so only 1 readFile call happens
    assert.strictEqual(readCalls.length, 1,
      `String should be wrapped in array, got ${readCalls.length} calls: ${JSON.stringify(readCalls.slice(0, 5))}`);
  });

  it('string knownFiles causes many unnecessary readFile calls instead of one', async () => {
    const index = new ProcessIndex();
    const readCalls = [];
    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async (path) => {
          readCalls.push(path);
          return { contents: '' };
        }
      },
      index
    });

    const filePath = '/proj/target.bpmn';
    await search.searchInKnownFiles('MyProcess', '/proj/current.bpmn', filePath);

    // With proper validation, there should be exactly 1 readFile call
    // (or 0 if the string is rejected). With the bug, we get many calls.
    assert.strictEqual(readCalls.length, 1,
      `Should read exactly 1 file but made ${readCalls.length} calls due to string spread: ${JSON.stringify(readCalls.slice(0, 10))}`);
  });
});
