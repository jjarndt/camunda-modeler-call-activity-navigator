export function getPathSeparator(filePath) {
  if (!filePath) return '/';
  return filePath.includes('\\') ? '\\' : '/';
}

export function normalizePath(inputPath, preferredSep) {
  if (!inputPath) return inputPath;

  const sep = preferredSep || (inputPath.includes('\\') ? '\\' : '/');
  const isWindows = sep === '\\';
  let root = '';
  let rest = inputPath;
  let hasRootSep = false;

  if (isWindows) {
    if (rest.startsWith('\\\\')) {
      const uncMatch = rest.match(/^\\\\[^\\]+\\[^\\]+/);
      if (uncMatch) {
        root = uncMatch[0];
        rest = rest.slice(root.length);
        if (rest.startsWith('\\') || rest.startsWith('/')) {
          hasRootSep = true;
          rest = rest.slice(1);
        }
      }
    } else {
      const driveMatch = rest.match(/^[A-Za-z]:/);
      if (driveMatch) {
        root = driveMatch[0];
        rest = rest.slice(root.length);
        if (rest.startsWith('\\') || rest.startsWith('/')) {
          hasRootSep = true;
          rest = rest.slice(1);
        }
      }
    }
  } else if (rest.startsWith('/')) {
    root = '/';
    rest = rest.slice(1);
    hasRootSep = true;
  }

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

  if (isWindows) {
    if (root) {
      if (hasRootSep) {
        return root + (joined ? sep + joined : sep);
      }
      return joined ? root + sep + joined : root;
    }
    return joined;
  }

  return root + joined;
}
