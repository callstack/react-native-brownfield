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

    options.buildFolder ??= path.join(
      userConfig.project.ios.sourceDir,
      'build' // default build folder in iOS project layout
    );

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
        // below: RN CLI config detection in Rock depends on the existence of a Rock config file;
        // the below is an escape hatch to provide the config manually and escape Rock's config-dependent logic
        iosConfigOverride: {
          sourceDir: userConfig.project.ios.sourceDir,
          xcodeProject: userConfig.project.ios.xcodeProject,
        },
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
