import { logger, type RockCLIOptions } from '@rock-js/tools';

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

function handleActionError(error: Error) {
  logger.error(`Error running command: ${error.message}`);
  process.exit(1);
}

export function actionRunner<T, R>(fn: (...args: T[]) => Promise<R>) {
  return (...args: T[]) => fn(...args).catch(handleActionError);
}
