import path from 'node:path';

import {
  getBuildOptions,
  type BuildFlags as AppleBuildFlags,
} from '@rock-js/platform-apple-helpers';
import { packageIosAction } from '@rock-js/plugin-brownfield-ios';
import { getReactNativeVersion } from '@rock-js/tools';

import { Command } from 'commander';

import { getProjectInfo } from '../utils/index.js';
import {
  actionRunner,
  curryOptions,
  ExampleUsage,
} from '../../shared/index.js';

export const packageIosCommand = curryOptions(
  new Command('package:ios').description('Build iOS XCFramework'),
  getBuildOptions({ platformName: 'ios' }).map((option) =>
    option.name.startsWith('--build-folder')
      ? {
          ...option,
          description:
            option.description +
            " By default, the '<iOS project folder>/build' path will be used.",
        }
      : option
  )
).action(
  actionRunner(async (options: AppleBuildFlags) => {
    const { projectRoot, platformConfig, userConfig } = getProjectInfo('ios');

    if (!userConfig.project.ios) {
      throw new Error('iOS project not found.');
    }

    if (!userConfig.project.ios.xcodeProject) {
      throw new Error('iOS Xcode project not found in the configuration.');
    }

    const brownieCacheDir = path.join(
      userConfig.project.ios.sourceDir,
      '.brownfield'
    );

    options.buildFolder ??= path.join(brownieCacheDir, 'build');

    await packageIosAction(
      options,
      {
        projectRoot,
        reactNativePath: userConfig.reactNativePath,
        // below: the userConfig.reactNativeVersion may be a non-semver-format string,
        // e.g. '0.82' (note the missing patch component),
        // therefore we resolve it manually from RN's package.json using Rock's utils
        reactNativeVersion: getReactNativeVersion(projectRoot),
        usePrebuiltRNCore: 0, // for brownfield, it is required to build RN from source
        packageDir: path.join(brownieCacheDir, 'package'), // the output directory for artifacts
        skipCache: true, // cache is dependent on existence of Rock config file
      },
      platformConfig
    );
  })
);

export const packageIosExample = new ExampleUsage(
  'package:ios --scheme BrownfieldLib --configuration Release',
  "Build iOS XCFramework for 'BrownfieldLib' scheme in Release configuration"
);
