export function getPathSeparator(filePath) {
  if (!filePath || typeof filePath !== 'string') return '/';
  return filePath.includes('\\') ? '\\' : '/';
}

function startsWithSeparator(str) {
  return str.startsWith('\\') || str.startsWith('/');
}

function extractRoot(path, isWindows) {
  // Always try Windows root detection if input has backslashes, drive letters, or UNC //
  const hasBackslash = path.includes('\\');
  if (isWindows || hasBackslash || /^[A-Za-z]:/.test(path) || path.startsWith('//')) {
    const winRoot = extractWindowsRoot(path);
    if (winRoot.root) return winRoot;
  }

  if (path.startsWith('/') || path.startsWith('\\')) {
    return { root: '/', rest: path.slice(1), hasRootSep: true };
  }

  return { root: '', rest: path, hasRootSep: false };
}

function extractWindowsRoot(path) {
  // UNC path: \\server\share or //server/share
  if (path.startsWith('\\\\') || path.startsWith('//')) {
    const uncMatch = path.match(/^(?:\\\\|\/\/)[^\\/]+[\\/][^\\/]+/);
    if (uncMatch) {
      return consumeRootSep(uncMatch[0], path.slice(uncMatch[0].length));
    }
    // Partial UNC (server only, no share): \\server or //server
    const partialUnc = path.match(/^(?:\\\\|\/\/)[^\\/]+/);
    if (partialUnc) {
      return { root: partialUnc[0], rest: path.slice(partialUnc[0].length), hasRootSep: false };
    }
  }

  // Drive letter: C:
  const driveMatch = path.match(/^[A-Za-z]:/);
  if (driveMatch) {
    return consumeRootSep(driveMatch[0], path.slice(driveMatch[0].length));
  }

  return { root: '', rest: path, hasRootSep: false };
}

function consumeRootSep(root, rest) {
  if (startsWithSeparator(rest)) {
    return { root, rest: rest.slice(1), hasRootSep: true };
  }
  return { root, rest, hasRootSep: false };
}

function stripControlChars(str) {
  return str.replace(/[\x00-\x1f\x7f]/g, '');
}

export function normalizePath(inputPath, preferredSep) {
  if (!inputPath || typeof inputPath !== 'string') return '';

  const trimmed = inputPath.trim();
  if (!trimmed) return '';

  const sep = preferredSep || (trimmed.includes('\\') ? '\\' : '/');
  const isWindows = sep === '\\';

  const { root, rest, hasRootSep } = extractRoot(trimmed, isWindows);

  const parts = rest.split(/[\\/]+/);
  const normalized = [];

  for (const rawPart of parts) {
    const part = stripControlChars(rawPart);
    if (!part || part === '.') continue;
    if (part === '..') {
      // Only treat as ".." if the raw segment was exactly ".." (no control chars injected)
      if (rawPart === '..') {
        if (normalized.length && normalized[normalized.length - 1] !== '..') {
          normalized.pop();
        } else if (!root || !hasRootSep) {
          normalized.push('..');
        }
      }
      continue;
    }
    normalized.push(part);
  }

  const joined = normalized.join(sep);

  if (root && root !== '/') {
    let normalizedRoot = root.replace(/[\\/]/g, sep);
    if (/^[a-z]:/.test(normalizedRoot)) {
      normalizedRoot = normalizedRoot[0].toUpperCase() + normalizedRoot.slice(1);
    }
    const isUncRoot = root.startsWith('\\\\') || root.startsWith('//');
    if (hasRootSep) {
      if (!joined && isUncRoot) {
        return normalizedRoot;
      }
      return normalizedRoot + (joined ? sep + joined : sep);
    }
    return joined ? normalizedRoot + joined : normalizedRoot;
  }

  if (root === '/') {
    const rootChar = isWindows ? '\\' : '/';
    return joined ? rootChar + joined : rootChar;
  }

  if (isWindows) {
    return joined || '.';
  }

  return joined || '.';
}
