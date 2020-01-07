const commander = require('commander');
const buildIOSArtifact = require('./commands/build-ios');

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
  .action(buildIOSArtifact);

program.parse(process.argv);
