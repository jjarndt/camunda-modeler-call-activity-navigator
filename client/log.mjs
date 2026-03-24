const PREFIX = '[CallActivityNavigator]';

export function debug(...args) {
  console.debug(PREFIX, ...args);
}

export function error(...args) {
  console.error(PREFIX, ...args);
}
