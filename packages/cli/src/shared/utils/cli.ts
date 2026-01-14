import { logger, RockError, type RockCLIOptions } from '@rock-js/tools';

import type { Command } from 'commander';

export function curryOptions(programCommand: Command, options: RockCLIOptions) {
  options.forEach((option) => {
    if (option.parse) {
      programCommand = programCommand.option(
        option.name,
        option.description,
        option.parse,
        option.default
      );
    } else {
      programCommand = programCommand.option(
        option.name,
        option.description,
        option.default
      );
    }
  });

  return programCommand;
}

export function actionRunner<T, R>(fn: (...args: T[]) => Promise<R>) {
  return async function wrappedCLIAction(...args: T[]) {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof RockError) {
        if (logger.isVerbose()) {
          logger.error(error);
        } else {
          logger.error(error.message);
          if (error.cause) {
            logger.error(`Cause: ${error.cause}`);
          }
        }
      } else {
        logger.error(`Unexpected error while running command:`, error);
      }

      process.exit(1);
    }
  };
}
