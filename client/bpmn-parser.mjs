function stripNonContent(str) {
  const chunks = [];
  let pos = 0;
  let searchFrom = 0;
  let noMoreComments = false;
  let noMoreCdata = false;
  let noMorePIs = false;

  while (searchFrom < str.length) {
    let piIdx = noMorePIs ? -1 : str.indexOf('<?', searchFrom);
    if (piIdx === -1) noMorePIs = true;
    const commentIdx = str.indexOf('<!', searchFrom);

    const nextPi = piIdx === -1 ? Infinity : piIdx;
    const nextComment = commentIdx === -1 ? Infinity : commentIdx;
    const nextIdx = Math.min(nextPi, nextComment);

    if (nextIdx === Infinity) break;

    if (nextIdx === nextPi && piIdx !== -1 && nextPi <= nextComment) {
      // Skip <?xml ...?> declaration
      if (str.startsWith('<?xml', piIdx) && /^<\?xml[\s?]/.test(str.slice(piIdx, piIdx + 7))) {
        searchFrom = piIdx + 5;
        const piEnd = str.indexOf('?>', searchFrom);
        searchFrom = piEnd !== -1 ? piEnd + 2 : searchFrom;
        continue;
      }
      const piEnd = str.indexOf('?>', piIdx + 2);
      if (piEnd !== -1) {
        chunks.push(str.slice(pos, piIdx));
        pos = piEnd + 2;
        searchFrom = pos;
        continue;
      }
      noMorePIs = true;
      searchFrom = piIdx + 2;
      continue;
    }

    const idx = commentIdx;
    if (idx === -1) break;

    if (!noMoreComments && str[idx + 2] === '-' && str[idx + 3] === '-') {
      const end = str.indexOf('-->', idx + 4);
      if (end !== -1) {
        chunks.push(str.slice(pos, idx));
        pos = end + 3;
        searchFrom = pos;
        continue;
      }
      noMoreComments = true;
    } else if (!noMoreCdata && str.startsWith('<![CDATA[', idx)) {
      const end = str.indexOf(']]>', idx + 9);
      if (end !== -1) {
        chunks.push(str.slice(pos, idx));
        pos = end + 3;
        searchFrom = pos;
        continue;
      }
      noMoreCdata = true;
    }

    if (noMoreComments && noMoreCdata) break;
    searchFrom = idx + 2;
  }

  if (pos === 0) return str;
  chunks.push(str.slice(pos));
  return chunks.join('');
}

const PROCESS_TAG_RE = /<(?:bpmn2?:)?process\s/g;
const MAX_SLOW_SCAN = 5000;
const SAFE_PROCESS_ID = /^[^\s/\\<>"']+$/;

function isAttrNameChar(ch) {
  return ch && ch !== '=' && ch !== '>' && ch !== '/' && ch !== '"' &&
    ch !== "'" && ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r';
}

function isInsideAttributeValue(content, matchIndex) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = matchIndex - 1; i >= 0; i--) {
    const ch = content[i];
    if (ch === '>' && !inSingleQuote && !inDoubleQuote) return false;
    if (ch === '<' && !inSingleQuote && !inDoubleQuote) return false;
    if (ch === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    if (ch === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
  }
  return inSingleQuote || inDoubleQuote;
}

function extractIdFromTag(content, startOfAttrs) {
  let i = startOfAttrs;
  let slowScan = 0;
  while (i < content.length && slowScan < MAX_SLOW_SCAN) {
    const ch = content[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === '>' || (ch === '/' && content[i + 1] === '>')) return null;
    if (ch === '"' || ch === "'") {
      const end = content.indexOf(ch, i + 1);
      if (end === -1) return null;
      i = end + 1;
      continue;
    }
    if (ch === 'i' && content[i + 1] === 'd' && !isAttrNameChar(content[i + 2])
      && (i === startOfAttrs || !isAttrNameChar(content[i - 1]))) {
      let j = i + 2;
      while (content[j] === ' ' || content[j] === '\t' || content[j] === '\n' || content[j] === '\r') j++;
      if (content[j] === '=') {
        j++;
        while (content[j] === ' ' || content[j] === '\t' || content[j] === '\n' || content[j] === '\r') j++;
        const q = content[j];
        if (q === '"' || q === "'") {
          const end = content.indexOf(q, j + 1);
          if (end === -1) return null;
          const val = content.slice(j + 1, end).trim();
          return val || null;
        }
      }
    }
    i++;
    slowScan++;
  }
  return null;
}

export function extractProcessIds(content) {
  if (!content || typeof content !== 'string') return [];

  const stripped = stripNonContent(content);
  const ids = [];

  PROCESS_TAG_RE.lastIndex = 0;
  let match;
  while ((match = PROCESS_TAG_RE.exec(stripped)) !== null) {
    if (isInsideAttributeValue(stripped, match.index)) continue;
    const id = extractIdFromTag(stripped, match.index + match[0].length);
    if (id && SAFE_PROCESS_ID.test(id)) ids.push(id);
  }

  return ids;
}
