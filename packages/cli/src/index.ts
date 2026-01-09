#!/usr/bin/env node

import path from 'node:path';

import { Command } from 'commander';

import {
  publishLocalAarAction,
  packageAarAction,
} from '@rock-js/plugin-brownfield-android';
import {
  packageAarOptions,
  publishLocalAarOptions,
  type PackageAarFlags,
  type PublishLocalAarFlags,
} from '@rock-js/platform-android';

import {
  getBuildOptions,
  type BuildFlags as AppleBuildFlags,
} from '@rock-js/platform-apple-helpers';
import { packageIosAction } from '@rock-js/plugin-brownfield-ios';
import { getReactNativeVersion, logger } from '@rock-js/tools';

import { curryOptions, getProjectInfo } from './utils';

const program = new Command();

program
  .name('react-native-brownfield')
  .description('React Native Brownfield library CLI')
  .version(process.env.npm_package_version ?? '0.0.0')
  .option('--verbose', 'Enable verbose output')
  .hook('preAction', (_cmd) => {
    const opts = program.opts();
    if (opts.verbose) {
      logger.setVerbose(opts.verbose ?? false);
    }
  });

curryOptions(
  program.command('package:android').description('Build Android AAR'),
  packageAarOptions
).action(async (options: PackageAarFlags) => {
  const { projectRoot, platformConfig } = getProjectInfo('android');

  await packageAarAction({
    projectRoot,
    pluginConfig: platformConfig,
    moduleName: options.moduleName,
    variant: options.variant,
  });
});

curryOptions(
  program
    .command('publish:android')
    .description('Publish Android package to Maven local'),
  publishLocalAarOptions
).action(async (options: PublishLocalAarFlags) => {
  const { projectRoot, platformConfig } = getProjectInfo('android');

  await publishLocalAarAction({
    projectRoot,
    pluginConfig: platformConfig,
    moduleName: options.moduleName,
  });
});

curryOptions(
  program.command('package:ios').description('Build iOS XCFramework'),
  getBuildOptions({ platformName: 'ios' })
).action(async (options: AppleBuildFlags) => {
  const { projectRoot, platformConfig, userConfig } = getProjectInfo('ios');

  if (!userConfig.project.ios) {
    throw new Error('iOS project not found.');
  }

  if (!userConfig.project.ios.xcodeProject) {
    throw new Error('iOS Xcode project not found in the configuration.');
  }

  packageIosAction(
    options,
    {
      projectRoot,
      reactNativePath: userConfig.reactNativePath,
      // below: the userConfig.reactNativeVersion may be a non-semver-format string,
      // e.g. '0.82' (note the missing patch component),
      // therefore we resolve it manually from RN's package.json using Rock's utils
      reactNativeVersion: getReactNativeVersion(projectRoot),
      usePrebuiltRNCore: 0, // for brownfield, it is required to build RN from source
      fingerprintOptions: {
        env: [],
        extraSources: [],
        ignorePaths: [],
        autolinkingConfig: userConfig,
      },
      remoteCacheProvider: null,
    },
    platformConfig,
    // below: Rock-dependent logic escape hatch
    {
      cacheRootPathOverride: path.join(
        userConfig.project.ios.sourceDir,
        'build' // default build folder in iOS project layout
      ),
      iosConfigOverride: {
        sourceDir: userConfig.project.ios.sourceDir,
        xcodeProject: userConfig.project.ios.xcodeProject,
      },
    }
  );
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
