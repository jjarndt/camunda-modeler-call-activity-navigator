import { debug } from './log.mjs';

const RELEASES_URL =
  'https://api.github.com/repos/jjarndt/camunda-modeler-call-activity-navigator/releases/latest';
const THROTTLE_KEY = 'callActivityNavigator.lastUpdateCheck';
const ONE_DAY_MS  = 24 * 60 * 60 * 1000;

const NO_UPDATE = Object.freeze({ available: false });

function stripPreRelease(version) {
  return version.replace(/[-+].*$/, '');
}

export function isNewerVersion(current, latest) {
  const currentParts = stripPreRelease(current).split('.').map(Number);
  const latestParts  = stripPreRelease(latest).split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if ((latestParts[i] || 0) > (currentParts[i] || 0)) return true;
    if ((latestParts[i] || 0) < (currentParts[i] || 0)) return false;
  }

  return false;
}

export async function checkForUpdate(currentVersion) {
  try {
    const lastCheck = localStorage.getItem(THROTTLE_KEY);

    if (lastCheck && Date.now() - Number(lastCheck) < ONE_DAY_MS) {
      return NO_UPDATE;
    }

    localStorage.setItem(THROTTLE_KEY, String(Date.now()));

    const response = await fetch(RELEASES_URL);

    if (!response.ok) {
      return NO_UPDATE;
    }

    const data = await response.json();
    const latestVersion = (data.tag_name || '').replace(/^v/, '');

    if (!latestVersion || !isNewerVersion(currentVersion, latestVersion)) {
      return NO_UPDATE;
    }

    return { available: true, latest: latestVersion, url: data.html_url };
  } catch (error) {
    debug('update check failed:', error);
    return NO_UPDATE;
  }
}
