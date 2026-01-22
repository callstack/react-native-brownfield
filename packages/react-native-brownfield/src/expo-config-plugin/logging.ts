const LOG_TAG = '[react-native-brownfield]';

export function log(message: string, ...args: any[]) {
  console.log(`${LOG_TAG} ${message}`, ...args);
}

export function logWarning(message: string, ...args: any[]) {
  console.warn(`${LOG_TAG} ${message}`, ...args);
}

export function logError(message: string, ...args: any[]) {
  console.error(`${LOG_TAG} ${message}`, ...args);
}
