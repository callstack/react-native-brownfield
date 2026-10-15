#!/usr/bin/env node

import { Command } from 'commander';

import { scaffoldBrownfieldInRncCliProject } from '@callstack/react-native-brownfield/scaffold';

const program = new Command();

program
  .name('create-react-native-brownfield')
  .description(
    'Scaffold React Native Brownfield packaging targets in an existing React Native CLI project.'
  )
  .option('-p, --path <path>', 'path to the React Native project', '.')
  .option(
    '--ios-framework-name <name>',
    'iOS framework target name (default: BrownfieldLib)'
  )
  .option(
    '--android-module-name <name>',
    'Android library module name (default: brownfieldlib)'
  )
  .option('--debug', 'enable verbose logging', false)
  .action(async (opts) => {
    await scaffoldBrownfieldInRncCliProject({
      projectRoot: opts.path,
      iosFrameworkName: opts.iosFrameworkName,
      androidModuleName: opts.androidModuleName,
      debug: !!opts.debug,
    });
  });

program.parse(process.argv);
