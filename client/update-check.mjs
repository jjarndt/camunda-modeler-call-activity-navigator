import { debug } from './log.mjs';

const RELEASES_URL =
  'https://api.github.com/repos/jjarndt/camunda-modeler-call-activity-navigator/releases/latest';
const THROTTLE_KEY = 'callActivityNavigator.lastUpdateCheck';
const ONE_DAY_MS  = 24 * 60 * 60 * 1000;

const NO_UPDATE = Object.freeze({ available: false });

function cleanVersion(version) {
  if (!version || typeof version !== 'string') return '';
  return version.replace(/^v/i, '').replace(/[-+].*$/, '');
}

function hasPreRelease(version) {
  if (!version || typeof version !== 'string') return false;
  const withoutV = version.replace(/^v/, '');
  return /-/.test(withoutV);
}

function isValidVersionStr(str) {
  return /^\d{1,10}(\.\d{1,10}){0,2}$/.test(str);
}

export function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      (parsed.hostname === 'github.com' || parsed.hostname.endsWith('.github.com')) &&
      !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function isNewerVersion(current, latest) {
  const currentStr = cleanVersion(current);
  const latestStr  = cleanVersion(latest);

  if (!isValidVersionStr(currentStr) || !isValidVersionStr(latestStr)) return false;

  const currentParts = currentStr.split('.').map(Number);
  const latestParts  = latestStr.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  // Same version numbers: pre-release < stable
  if (hasPreRelease(current) && !hasPreRelease(latest)) return true;

  return false;
}

export async function checkForUpdate(currentVersion) {
  try {
    const lastCheck = localStorage.getItem(THROTTLE_KEY);

    if (lastCheck && Date.now() - Number(lastCheck) < ONE_DAY_MS) {
      return NO_UPDATE;
    }

    localStorage.setItem(THROTTLE_KEY, String(Date.now()));

    const response = await fetch(RELEASES_URL, {
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      return NO_UPDATE;
    }

    const data = await response.json();
    const latestVersion = (data.tag_name || '').replace(/^v/, '');

    if (!latestVersion || !isNewerVersion(currentVersion, latestVersion)) {
      return NO_UPDATE;
    }

    const url = isSafeUrl(data.html_url) ? data.html_url : RELEASES_URL;
    return { available: true, latest: latestVersion, url };
  } catch (error) {
    debug('update check failed:', error);
    return NO_UPDATE;
  }
}
