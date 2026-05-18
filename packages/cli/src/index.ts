import { styleText } from 'node:util';

import { logger } from '@rock-js/tools';

import { Command } from 'commander';

import { ExampleUsage } from './shared/index.js';
import brownfieldCommands, {
  groupName as brownfieldCommandsGroupName,
  loadConfig,
  validateConfig,
  type BrownfieldConfig,
} from './brownfield/index.js';
import brownieCommands, {
  groupName as brownieCommandsGroupName,
} from './brownie/index.js';
import navigationCommands, {
  groupName as navigationCommandsGroupName,
} from './navigation/index.js';

const program = new Command();

program
  .name(styleText('magenta', 'brownfield'))
  .usage(styleText('yellow', '[options] [command]'))
  .description(
    styleText('magentaBright', 'React Native Brownfield CLI - ') +
      styleText(['magenta', 'bold', 'underline'], 'Brownie')
  )
  .version(process.env.npm_package_version ?? '0.0.0');

program
  .optionsGroup('Global options:')
  .option('--verbose', 'enable verbose logging')
  .hook('preAction', () => {
    const opts = program.opts();
    if (opts.verbose) {
      logger.setVerbose(opts.verbose ?? false);
    }
  });

program.configureHelp({
  styleTitle: (str) => styleText('bold', str),
  styleCommandText: (str) => styleText('cyan', str),
  styleArgumentText: (str) => styleText('yellow', str),
  styleSubcommandText: (str) => styleText('blue', str),
});

function applyConfigValueToCommand(command: Command, key: string, value: unknown) {
  command.setOptionValueWithSource(key, value, 'config');
}

function applyBrownfieldConfigToCommands(config: BrownfieldConfig) {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      continue;
    }

    applyConfigValueToCommand(program, key, value);

    for (const command of Object.values(brownfieldCommands)) {
      if (command instanceof Command) {
        applyConfigValueToCommand(command, key, value);
      }
    }
  }
}

function registrationHelper(
  commandsRegistration: Record<string, unknown | Command | ExampleUsage>,
  groupName: string
) {
  program.commandsGroup(groupName);

  const exampleUsageItems: ExampleUsage[] = [];
  Object.values(commandsRegistration).forEach((commandOrExampleUsage) => {
    if (commandOrExampleUsage instanceof Command) {
      // command
      program.addCommand(commandOrExampleUsage);
    } else if (commandOrExampleUsage instanceof ExampleUsage) {
      // piece of example usage for the command group
      exampleUsageItems.push(commandOrExampleUsage);
    }
  });

  if (exampleUsageItems.length) {
    const longestUsageItemCommandLength = exampleUsageItems.reduce(
      (max, item) => Math.max(max, item.command.length),
      0
    );

    program.addHelpText(
      'after',
      `\nExamples:\n${exampleUsageItems.map((item) => `\t ${styleText('dim', item.command.padEnd(longestUsageItemCommandLength))}\t${item.description}`).join('\n')}\n`
    );
  }
}

const reactNativeBrownfieldConfig = loadConfig()

validateConfig(reactNativeBrownfieldConfig);

console.debug('Loaded Brownfield config:', reactNativeBrownfieldConfig);

applyBrownfieldConfigToCommands(reactNativeBrownfieldConfig);

registrationHelper(brownfieldCommands, brownfieldCommandsGroupName);
registrationHelper(brownieCommands, brownieCommandsGroupName);
registrationHelper(navigationCommands, navigationCommandsGroupName);

program.commandsGroup('Utility commands').helpCommand('help [command]');

export function runCLI(argv: string[]): void {
  program.parse(argv);

  if (!argv.slice(2).length) {
    program.outputHelp();
  }
}
