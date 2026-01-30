import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

async function readFixture(name) {
  const filePath = path.join(fixturesDir, name);
  return fs.readFile(filePath, 'utf-8');
}

test('extractProcessIds finds a single process', async () => {
  const content = await readFixture('single-process.bpmn');
  assert.deepEqual(extractProcessIds(content), ['Process_A']);
});

test('extractProcessIds finds multiple processes', async () => {
  const content = await readFixture('embedded-multiple.bpmn');
  assert.deepEqual(extractProcessIds(content), ['Process_One', 'Process_Two']);
});

test('extractProcessIds returns empty for collaboration-only file', async () => {
  const content = await readFixture('collaboration-only.bpmn');
  assert.deepEqual(extractProcessIds(content), []);
});

test('extractProcessIds handles mixed namespaces with bpmn2 prefix', async () => {
  const content = await readFixture('namespaces-mixed.bpmn');
  assert.deepEqual(extractProcessIds(content), ['Process_X']);
});
