#!/usr/bin/env node
// Attach to a running Camunda Modeler via Chrome DevTools Protocol.
//
// Usage:
//   node tools/modeler-devtools.mjs start                       # launch Modeler with --remote-debugging-port=9222
//   node tools/modeler-devtools.mjs attach [--port 9222]        # stream console+errors to /tmp/modeler-console.jsonl
//   node tools/modeler-devtools.mjs tail [--n 100]              # show last N events
//   node tools/modeler-devtools.mjs eval "<expr>"               # evaluate JS in the renderer and print result
//   node tools/modeler-devtools.mjs reload                      # reload the renderer (re-loads plugins)
//
// Requires Node >= 22 (global WebSocket).

import { spawn } from 'node:child_process';
import { existsSync, appendFileSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const LOG_PATH = '/tmp/modeler-console.jsonl';
const PID_PATH = '/tmp/modeler-devtools.pid';
const MODELER_BIN = '/Applications/Camunda Modeler.app/Contents/MacOS/Camunda Modeler';
const DEFAULT_PORT = 9222;

const args = process.argv.slice(2);
const cmd = args[0];

function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function getTargets(port) {
  const res = await fetch(`http://localhost:${port}/json`);
  if (!res.ok) throw new Error(`devtools list failed: ${res.status}`);
  return res.json();
}

async function pickRendererTarget(port) {
  const targets = await getTargets(port);
  // Prefer the main app window (page/iframe with a webSocketDebuggerUrl, not devtools itself).
  const candidates = targets.filter(t =>
    t.type === 'page' && t.webSocketDebuggerUrl && !t.url.startsWith('devtools://'));
  if (!candidates.length) throw new Error('no renderer target found');
  // Heuristic: prefer the one whose title looks like Camunda Modeler.
  candidates.sort((a, b) => (b.title?.toLowerCase().includes('modeler') ? 1 : 0)
                          - (a.title?.toLowerCase().includes('modeler') ? 1 : 0));
  return candidates[0];
}

function openWS(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', e => reject(e), { once: true });
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', evt => {
      const msg = JSON.parse(evt.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        const h = this.handlers.get(msg.method);
        if (h) h(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) { this.handlers.set(method, fn); }
}

function logEvent(obj) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n';
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, line);
  process.stdout.write(line);
}

function formatRemoteObject(o) {
  if (!o) return '';
  if ('value' in o) return JSON.stringify(o.value);
  if (o.description) return o.description;
  return o.type;
}

async function cmdStart() {
  if (!existsSync(MODELER_BIN)) {
    console.error(`Modeler not found at ${MODELER_BIN}`);
    process.exit(1);
  }
  const child = spawn(MODELER_BIN, [ `--remote-debugging-port=${DEFAULT_PORT}` ], {
    detached: true, stdio: 'ignore',
  });
  child.unref();
  writeFileSync(PID_PATH, String(child.pid));
  console.log(`Modeler started (pid ${child.pid}); DevTools at http://localhost:${DEFAULT_PORT}`);
}

async function cmdAttach() {
  const port = Number(arg('--port', DEFAULT_PORT));
  const target = await pickRendererTarget(port);
  console.log(`attaching to: ${target.title} (${target.url})`);
  const ws = await openWS(target.webSocketDebuggerUrl);
  const cdp = new CDP(ws);

  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');

  cdp.on('Runtime.consoleAPICalled', p => logEvent({
    kind: 'console', level: p.type,
    args: p.args.map(formatRemoteObject),
    stack: p.stackTrace?.callFrames?.slice(0, 5),
  }));
  cdp.on('Runtime.exceptionThrown', p => logEvent({
    kind: 'exception',
    text: p.exceptionDetails.text,
    exception: p.exceptionDetails.exception ? formatRemoteObject(p.exceptionDetails.exception) : null,
    url: p.exceptionDetails.url,
    line: p.exceptionDetails.lineNumber,
    col: p.exceptionDetails.columnNumber,
    stack: p.exceptionDetails.stackTrace?.callFrames?.slice(0, 10),
  }));
  cdp.on('Log.entryAdded', p => logEvent({
    kind: 'log', level: p.entry.level, source: p.entry.source,
    text: p.entry.text, url: p.entry.url, line: p.entry.lineNumber,
  }));

  console.log(`streaming to ${LOG_PATH} (Ctrl+C to stop)`);
  await new Promise(() => {});
}

async function cmdTail() {
  const n = Number(arg('--n', 100));
  if (!existsSync(LOG_PATH)) { console.log('(no log yet)'); return; }
  const lines = readFileSync(LOG_PATH, 'utf8').trim().split('\n');
  for (const l of lines.slice(-n)) console.log(l);
}

async function cmdEval() {
  const expr = args.slice(1).join(' ');
  if (!expr) { console.error('usage: eval "<expr>"'); process.exit(1); }
  const port = Number(arg('--port', DEFAULT_PORT));
  const target = await pickRendererTarget(port);
  const ws = await openWS(target.webSocketDebuggerUrl);
  const cdp = new CDP(ws);
  const res = await cdp.send('Runtime.evaluate', {
    expression: expr, returnByValue: true, awaitPromise: true,
  });
  if (res.exceptionDetails) {
    console.error('exception:', res.exceptionDetails.text);
    if (res.result) console.error(formatRemoteObject(res.result));
    process.exit(1);
  }
  console.log(formatRemoteObject(res.result));
  ws.close();
}

async function cmdReload() {
  const port = Number(arg('--port', DEFAULT_PORT));
  const target = await pickRendererTarget(port);
  const ws = await openWS(target.webSocketDebuggerUrl);
  const cdp = new CDP(ws);
  await cdp.send('Page.reload', { ignoreCache: true });
  console.log('reload triggered');
  ws.close();
}

const dispatch = {
  start: cmdStart, attach: cmdAttach, tail: cmdTail, eval: cmdEval, reload: cmdReload,
};
const handler = dispatch[cmd];
if (!handler) {
  console.error('commands: start | attach | tail | eval "<expr>" | reload');
  process.exit(1);
}
handler().catch(e => { console.error('error:', e.message); process.exit(1); });
