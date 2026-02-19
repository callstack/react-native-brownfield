const LOG_TAG = '[react-native-brownfield]';

export class Logger {
  private static debug: boolean = false;

  static setIsDebug(enabled: boolean) {
    this.debug = enabled;
  }

  static logInfo(message: string, ...args: any[]) {
    console.log(`${LOG_TAG} ${message}`, ...args);
  }

  static logDebug(message: string, ...args: any[]) {
    if (!this.debug) {
      return;
    }

    console.debug(`${LOG_TAG} ${message}`, ...args);
  }

  static logWarning(message: string, ...args: any[]) {
    console.warn(`${LOG_TAG} ${message}`, ...args);
  }

  static logError(message: string, ...args: any[]) {
    console.error(`${LOG_TAG} ${message}`, ...args);
  }
}
