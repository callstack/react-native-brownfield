#!/usr/bin/env node

import commander from 'commander';
import buildIOSArtifact from './commands/build-ios';

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
  .option('--useNpm', 'use npm instead of yarn')
  .action(buildIOSArtifact);

program.parse(process.argv);
