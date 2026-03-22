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

  const cleaned = stripControlChars(inputPath);
  if (!cleaned) return '';

  const sep = preferredSep || (cleaned.includes('\\') ? '\\' : '/');
  const isWindows = sep === '\\';

  const { root, rest, hasRootSep } = extractRoot(cleaned, isWindows);

  const parts = rest.split(/[\\/]+/);
  const normalized = [];

  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (normalized.length && normalized[normalized.length - 1] !== '..') {
        normalized.pop();
      } else if (!root) {
        normalized.push('..');
      }
      continue;
    }
    normalized.push(part);
  }

  const joined = normalized.join(sep);

  if (root && root !== '/') {
    const normalizedRoot = root.replace(/[\\/]/g, sep);
    if (hasRootSep) {
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
