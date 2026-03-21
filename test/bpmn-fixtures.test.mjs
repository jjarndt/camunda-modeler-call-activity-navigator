import { describe, test } from 'node:test';
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

describe('fixture-based tests', () => {
  test('finds a single process id', async () => {
    const content = await readFixture('single-process.bpmn');
    assert.deepEqual(extractProcessIds(content), ['Process_A']);
  });

  test('finds multiple process ids in one file', async () => {
    const content = await readFixture('embedded-multiple.bpmn');
    assert.deepEqual(extractProcessIds(content), ['Process_One', 'Process_Two']);
  });

  test('returns empty array for collaboration-only file without processes', async () => {
    const content = await readFixture('collaboration-only.bpmn');
    assert.deepEqual(extractProcessIds(content), []);
  });

  test('handles mixed namespaces with bpmn2 prefix', async () => {
    const content = await readFixture('namespaces-mixed.bpmn');
    assert.deepEqual(extractProcessIds(content), ['Process_X']);
  });
});

describe('inline edge cases', () => {
  test('returns empty array for empty string', () => {
    assert.deepEqual(extractProcessIds(''), []);
  });

  test('returns empty array for null input', () => {
    assert.deepEqual(extractProcessIds(null), []);
  });

  test('returns empty array for undefined input', () => {
    assert.deepEqual(extractProcessIds(undefined), []);
  });

  test('returns empty array for non-string input (number, object)', () => {
    assert.deepEqual(extractProcessIds(42), []);
    assert.deepEqual(extractProcessIds({}), []);
  });

  test('returns empty array for plain text without XML', () => {
    assert.deepEqual(extractProcessIds('just some random text without any xml'), []);
  });

  test('returns empty array for XML without process elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:collaboration id="Collab_1">
    <bpmn:participant id="Participant_1" />
  </bpmn:collaboration>
</bpmn:definitions>`;
    assert.deepEqual(extractProcessIds(xml), []);
  });

  test('extracts id from self-closing process tags', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="SelfClosing_1" />
</bpmn:definitions>`;
    assert.deepEqual(extractProcessIds(xml), ['SelfClosing_1']);
  });

  test('extracts id when it is not the first attribute on the element', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process isExecutable="true" name="My Process" id="Process_NotFirst" isClosed="false">
  </bpmn:process>
</bpmn:definitions>`;
    assert.deepEqual(extractProcessIds(xml), ['Process_NotFirst']);
  });

  test('ignores non-process elements that have id attributes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:serviceTask id="Task_1" name="Do something" />
  <bpmn:startEvent id="Start_1" name="Begin" />
</bpmn:definitions>`;
    assert.deepEqual(extractProcessIds(xml), []);
  });
});
