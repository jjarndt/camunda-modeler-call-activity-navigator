/**
 * BUG-API-025: extractIdFromTag matched "id=" als Substring in laengeren
 * Attributnamen wie "customid=", "processId=", "xmlid=".
 *
 * extractIdFromTag iteriert zeichenweise und prueft content.startsWith('id=', i).
 * Das matched JEDES Vorkommen von "id=" -- auch innerhalb anderer Attributnamen.
 *
 * Beispiel: <process customid="wrong" id="correct">
 * Der Parser findet "id=" innerhalb von "customid=" und extrahiert "wrong"
 * statt "correct".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-API-025: extractProcessIds matched id= als Substring', () => {

  it('extrahiert falsche ID wenn customid= vor id= steht', () => {
    const bpmn = `<bpmn:process customid="wrong" id="correct"></bpmn:process>`;

    const result = extractProcessIds(bpmn);

    assert.deepStrictEqual(result, ['correct'],
      'Muss "correct" extrahieren, nicht "wrong" aus customid=');
  });

  it('extrahiert falsche ID aus valid= Attribut (enthaelt "id=" nicht)', () => {
    // processId= enthaelt "Id=" (grosses I), matched nicht wegen Case.
    // Aber "valid=" enthaelt "lid=" -> "id=" matched ab Position 2!
    const bpmn = `<bpmn:process valid="notThis" id="realId"></bpmn:process>`;

    const result = extractProcessIds(bpmn);

    assert.deepStrictEqual(result, ['realId'],
      'Muss "realId" extrahieren, nicht "notThis" aus valid=');
  });

  it('extrahiert falsche ID aus xmlid= Attribut', () => {
    const bpmn = `<bpmn:process xmlid="xml123" id="bpmnId"></bpmn:process>`;

    const result = extractProcessIds(bpmn);

    assert.deepStrictEqual(result, ['bpmnId'],
      'Muss "bpmnId" extrahieren, nicht "xml123" aus xmlid=');
  });

  it('funktioniert korrekt wenn id= das erste Attribut ist', () => {
    // Kontrolle: Wenn id= zuerst kommt, ist das Ergebnis korrekt
    const bpmn = `<bpmn:process id="firstId" customid="other"></bpmn:process>`;

    const result = extractProcessIds(bpmn);

    assert.deepStrictEqual(result, ['firstId'],
      'Wenn id= zuerst kommt, muss es korrekt extrahiert werden');
  });
});
