import type { RockCLIOptions } from '@rock-js/tools';
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
