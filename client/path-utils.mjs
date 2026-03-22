export function getPathSeparator(filePath) {
  if (!filePath || typeof filePath !== 'string') return '/';
  return filePath.includes('\\') ? '\\' : '/';
}

function startsWithSeparator(str) {
  return str.startsWith('\\') || str.startsWith('/');
}

function extractRoot(path, isWindows) {
  // Always try Windows root detection if input has backslashes or drive letters
  const hasBackslash = path.includes('\\');
  if (isWindows || hasBackslash || /^[A-Za-z]:/.test(path)) {
    const winRoot = extractWindowsRoot(path);
    if (winRoot.root) return winRoot;
  }

  if (path.startsWith('/')) {
    return { root: '/', rest: path.slice(1), hasRootSep: true };
  }

  return { root: '', rest: path, hasRootSep: false };
}

function extractWindowsRoot(path) {
  // UNC path: \\server\share
  if (path.startsWith('\\\\')) {
    const uncMatch = path.match(/^\\\\[^\\]+\\[^\\]+/);
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

export function normalizePath(inputPath, preferredSep) {
  if (!inputPath || typeof inputPath !== 'string') return '';

  const sep = preferredSep || (inputPath.includes('\\') ? '\\' : '/');
  const isWindows = sep === '\\';

  const { root, rest, hasRootSep } = extractRoot(inputPath, isWindows);

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
    return joined ? '/' + joined : '/';
  }

  if (isWindows) {
    return joined || '.';
  }

  return joined || '.';
}
