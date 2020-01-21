#!/usr/bin/env node

import commander from 'commander';
import buildIOSArtifact from './commands/build-ios';
import buildAndroid from './commands/build-android';

const program = new commander.Command();
program.version(
  require('../package.json').version,
  '-v, --version',
  'output the current version',
);

program
  .command('build-ios')
  .description('build native artifact')
  .option('-e, --entryFile <entryFile>', 'Remove recursively')
  .option('--useNpm', 'Use npm instead of yarn')
  .option('-o, --outputDir <outputDir>', 'Relative output directory')
  .action(buildIOSArtifact);

program
  .command('build-android')
  .description('build android')
  .option('-e, --entryFile <entryFile>', 'Remove recursively')
  .option('--useNpm', 'Use npm instead of yarn')
  .action(buildAndroid);

program.parse(process.argv);
