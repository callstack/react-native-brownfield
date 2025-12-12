#!/usr/bin/env node

import path from 'node:path';

import loadConfig from '@react-native-community/cli-config/build/loadConfig';
import { projectConfig } from '@react-native-community/cli-config-android';

import { spinner, intro, logger, outro } from '@rock-js/tools';
import {
  packageAar,
  packageAarOptions,
  publishLocalAar,
  publishLocalAarOptions,
} from '@rock-js/platform-android';

import { Command } from 'commander';

import {
  curryOptions,
  executeCommand,
  findProjectRoot,
  getAarConfig,
  makeRelativeAndroidProjectConfigPaths,
} from './utils';
import { version } from '../../package.json';

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
      'No module name specified, packaging from root project. Usually, this is not what you want; if this fails, specify --module-name to target a specific module.'
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

curryOptions(program.command('package:ios').description('Build iOS package'), [
  {
    name: '--workspace <workspace>',
    description: 'The Xcode workspace to build',
  },
  {
    name: '--scheme <scheme>',
    description: 'The Xcode scheme to build',
  },
  {
    name: '--configuration <configuration>',
    description: 'The build configuration to use (Debug/Release)',
    value: 'Debug',
  },
  {
    name: '--sdk <sdk>',
    description: 'The SDK to build for (e.g. iphoneos/iphonesimulator)',
    value: 'iphonesimulator',
  },
]).action(async (options) => {
  const projectRoot = findProjectRoot();
  const userConfig = loadConfig({ projectRoot, selectedPlatform: 'ios' });

  const { xcodeProject, sourceDir: iosBaseDir } = userConfig.project.ios!;

  intro(
    `Building iOS package from project '${xcodeProject?.name ?? '(no name configured)'}'...`
  );

  logger.debug('Detected user config:', userConfig);
  logger.debug('Detected Xcode project config:', xcodeProject);

  const buildFolder = options.buildFolder ?? path.join(iosBaseDir, 'build');

  let scheme = options.scheme;

  if (!scheme) {
    const results = await executeCommand('xcodebuild', ['-list', '-json'], {
      cwd: iosBaseDir,
    });

    let schemes: string[];
    try {
      const parsed = JSON.parse(results.join(' '));
      schemes = parsed!.project!.schemes;
    } catch {
      throw new Error("Couldn't parse xcodebuild output");
    }

    if (schemes.length === 0) {
      throw new Error(
        'No schemes found in the Xcode project. Please specify one using --scheme.'
      );
    }

    scheme = schemes[0];
  }

  const workspace = options.workspace ?? xcodeProject!.name;

  if (!workspace) {
    throw new Error(
      'No workspace specified and could not be inferred from the config. Please specify one using --workspace.'
    );
  }

  const platform = options.sdk === 'iphonesimulator' ? 'iOS Simulator' : 'iOS';

  const { start, stop } = spinner();

  start(`Packaging framework for ${platform}...`);

  await executeCommand(
    'xcodebuild',
    [
      '-workspace',
      workspace.endsWith('.xcworkspace')
        ? workspace
        : `${workspace}.xcworkspace`,
      '-scheme',
      scheme,
      '-configuration',
      options.configuration,
      '-sdk',
      options.sdk,
      '-destination',
      options.destination,
      ...(options.target ? ['-target', options.target] : []),
      'build',
      'CODE_SIGNING_ALLOWED=NO',
      `BUILD_DIR=${path.relative(iosBaseDir, buildFolder)}`,
    ],
    {
      cwd: iosBaseDir,
    }
  );

  stop();

  outro('Success 🎉');
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
