import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-001: bpmn-parser – Regex matcht IDs in XML-Kommentaren
// Die Regex /<bpmn2?:process[^>]+id="([^"]+)"/g unterscheidet nicht zwischen
// echtem XML-Markup und Kommentar-Inhalten. Ghost-IDs werden in den Index
// aufgenommen und koennen falsche Navigationsziele liefern.
// ---------------------------------------------------------------------------
describe('BUG-DATA-001: bpmn-parser matches process IDs inside XML comments', () => {
  it('must NOT extract process IDs from XML comments', () => {
    const xml = `<?xml version="1.0"?>
<!-- <bpmn:process id="ghost-process" isExecutable="true"/> -->
<bpmn:definitions>
  <bpmn:process id="real-process" isExecutable="true"/>
</bpmn:definitions>`;
    const ids = extractProcessIds(xml);
    assert.ok(!ids.includes('ghost-process'),
      `Regex matched process ID inside XML comment: got [${ids}]`);
    assert.ok(ids.includes('real-process'),
      'real-process should be found');
  });
});

// ---------------------------------------------------------------------------
// BUG-DATA-002: bpmn-parser – Regex matcht IDs in CDATA-Abschnitten
// CDATA-Inhalte sind keine XML-Elemente, werden aber von der Regex nicht
// ausgeschlossen. Ghost-IDs aus Dokumentations-CDATA landen im Index.
// ---------------------------------------------------------------------------
describe('BUG-DATA-002: bpmn-parser matches process IDs inside CDATA sections', () => {
  it('must NOT extract process IDs from CDATA sections', () => {
    const xml = `<?xml version="1.0"?>
<bpmn:definitions>
  <bpmn:process id="real-process" isExecutable="true">
    <bpmn:documentation><![CDATA[
      Example: <bpmn:process id="cdata-ghost" />
    ]]></bpmn:documentation>
  </bpmn:process>
</bpmn:definitions>`;
    const ids = extractProcessIds(xml);
    assert.ok(!ids.includes('cdata-ghost'),
      `Regex matched process ID inside CDATA: got [${ids}]`);
    assert.ok(ids.includes('real-process'),
      'real-process should be found');
  });
});

// ---------------------------------------------------------------------------
// BUG-DATA-003: bpmn-parser – Single-quote Attribut-Syntax nicht unterstuetzt
// XML erlaubt Attribute sowohl mit doppelten als auch mit einfachen Anfuehrungs-
// zeichen. Die Regex sucht nur nach id="..." und verpasst id='...' vollstaendig.
// ---------------------------------------------------------------------------
describe('BUG-DATA-003: bpmn-parser ignores single-quoted id attribute', () => {
  it('must extract process ID with single-quoted attribute', () => {
    const xml = `<bpmn:process id='single-quote-process' isExecutable="true"/>`;
    const ids = extractProcessIds(xml);
    assert.ok(ids.includes('single-quote-process'),
      `Single-quoted id attribute not recognized: got [${ids}]`);
  });
});

// ---------------------------------------------------------------------------
// BUG-DATA-004: process-index – setFileIndex mit leerem Pfad ('') erzeugt
// Geister-Eintraege. normalizePath('') gibt '' zurueck (falsy-Passthrough).
// Danach ist isIndexed('') == false (Map-Lookup scheitert), aber die Locations-
// Map enthaelt trotzdem einen Eintrag fuer processId mit path=''.
// ---------------------------------------------------------------------------
describe('BUG-DATA-004: ProcessIndex.setFileIndex with empty path pollutes index', () => {
  it('setFileIndex with empty path must not create location entries', () => {
    const idx = new ProcessIndex();
    idx.setFileIndex('', ['some-process']);
    const locs = idx.getLocations('some-process');
    assert.equal(locs.length, 0,
      `empty path created ${locs.length} location entry/entries; path value: "${locs[0]?.path}"`);
  });
});

// ---------------------------------------------------------------------------
// BUG-DATA-005: bpmn-parser – Regex trifft auch Elemente die mit "process"
// anfangen aber keine <bpmn:process>-Elemente sind (z.B. <bpmn:processDefinition>).
// Der Regex [^>]+ laesst beliebige Tag-Namen nach "bpmn2?:process" passieren.
// ---------------------------------------------------------------------------
describe('BUG-DATA-005: bpmn-parser matches elements whose tag starts with "process"', () => {
  it('must NOT match <bpmn:processDefinition> as a process ID', () => {
    const xml = `<bpmn:definitions>
  <bpmn:processDefinition id="should-not-match"/>
  <bpmn:process id="real-id" isExecutable="true"/>
</bpmn:definitions>`;
    const ids = extractProcessIds(xml);
    assert.ok(!ids.includes('should-not-match'),
      `<bpmn:processDefinition id="..."> was incorrectly matched; got [${ids}]`);
    assert.ok(ids.includes('real-id'), 'real-id should be found');
  });
});
