function stripComments(str) {
  const chunks = [];
  let pos = 0;
  let searchFrom = 0;
  let noMoreComments = false;
  let noMoreCdata = false;

  while (searchFrom < str.length) {
    const idx = str.indexOf('<!', searchFrom);
    if (idx === -1) break;

    if (!noMoreComments && str[idx + 2] === '-' && str[idx + 3] === '-') {
      let end = str.indexOf('-->', idx + 4);
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

function isAttrNameChar(ch) {
  return ch && ch !== '=' && ch !== '>' && ch !== '/' && ch !== '"' &&
    ch !== "'" && ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r';
}

function extractIdFromTag(content, startOfAttrs) {
  let i = startOfAttrs;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '>' || (ch === '/' && content[i + 1] === '>')) return null;
    if (ch === '"' || ch === "'") {
      const end = content.indexOf(ch, i + 1);
      if (end === -1) return null;
      i = end + 1;
      continue;
    }
    if (ch === 'i' && content[i + 1] === 'd' && !isAttrNameChar(content[i + 2])
      && (i === startOfAttrs || !isAttrNameChar(content[i - 1]))) {
      // Skip whitespace around '='
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
  }
  return null;
}

export function extractProcessIds(content) {
  if (!content || typeof content !== 'string') return [];

  const stripped = stripComments(content);
  const ids = [];

  let match;
  while ((match = PROCESS_TAG_RE.exec(stripped)) !== null) {
    const id = extractIdFromTag(stripped, match.index + match[0].length);
    if (id) ids.push(id);
  }

  return ids;
}
