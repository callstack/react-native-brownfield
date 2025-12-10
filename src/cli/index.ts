#!/usr/bin/env node

import loadConfig from '@react-native-community/cli-config/build/loadConfig';
import { projectConfig } from '@react-native-community/cli-config-android';

import { Command } from 'commander';

import { version } from '../../package.json';

import {
  packageAar,
  packageAarOptions,
  publishLocalAar,
  publishLocalAarOptions,
} from '@rock-js/platform-android';

import { intro, logger } from '@rock-js/tools';

import {
  curryOptions,
  findProjectRoot,
  getAarConfig,
  makeRelativeAndroidProjectConfigPaths,
} from './utils';

const program = new Command();

program
  .name('react-native-brownfield')
  .description('React Native Brownfield library CLI')
  .version(version)
  .option('--verbose', 'Enable verbose output')
  .hook('preAction', (_cmd) => {
    const opts = program.opts();
    if (opts.verbose) {
      logger.setVerbose(opts.verbose ?? false);
    }
  });

function commonAndroidPackageConfigParser<T>(
  projectRoot: string,
  options: any,
  callback: (config: ReturnType<typeof getAarConfig>) => T
): T {
  if (!options.moduleName) {
    logger.warn(
      'No module name specified, packaging from root project. Usually, this is not what you want; if this fails, specify --module-name to target a specific module, which is usually "app".'
    );
  }

  logger.debug('Project root found at:', projectRoot);

  const userConfig = loadConfig({ projectRoot, selectedPlatform: 'android' });

  logger.debug('RN CLI user config loaded:', userConfig);

  const androidConfig = projectConfig(
    projectRoot,
    makeRelativeAndroidProjectConfigPaths(
      projectRoot,
      userConfig.project.android
    )
  );

  logger.debug('Android user config loaded:', userConfig);

  if (androidConfig) {
    const config = getAarConfig(options, androidConfig);
    return callback(config);
  } else {
    throw new Error('Android project not found.');
  }
}

curryOptions(
  program.command('package:android').description('Build Android package'),
  packageAarOptions
).action(async (options) => {
  const projectRoot = findProjectRoot();

  intro(
    `Building Android package ${options.moduleName ? `for module '${options.moduleName}'` : 'from root project'}...`
  );

  await commonAndroidPackageConfigParser(projectRoot, options, (config) =>
    packageAar(config, options)
  );
});

curryOptions(
  program
    .command('publish:android')
    .description('Publish Android package to Maven local'),
  publishLocalAarOptions
).action(async (options) => {
  const projectRoot = findProjectRoot();

  intro(
    `Publishing Android package to Maven local ${options.moduleName ? `for module '${options.moduleName}'` : 'from root project'}...`
  );

  await commonAndroidPackageConfigParser(projectRoot, options, (config) =>
    publishLocalAar(config)
  );
});

// TODO: implement the below
program
  .command('package:ios')
  .description('Build iOS package')
  .action((_options) => {
    intro('Building iOS package...');

    // const projectRoot = findProjectRoot();
    // const iosDir = path.join(projectRoot, 'ios');
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
