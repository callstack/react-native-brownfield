import path from 'node:path';

import {
  getBuildOptions,
  mergeFrameworks,
  type BuildFlags as AppleBuildFlags,
} from '@rock-js/platform-apple-helpers';
import { packageIosAction } from '@rock-js/plugin-brownfield-ios';
import {
  colorLink,
  getReactNativeVersion,
  logger,
  relativeToCwd,
} from '@rock-js/tools';

import { Command } from 'commander';

import { runExpoPrebuildIfNeeded } from '../utils/expo.js';
import { getProjectInfo } from '../utils/project.js';
import {
  actionRunner,
  curryOptions,
  ExampleUsage,
} from '../../shared/index.js';
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { stripFrameworkBinary } from '../utils/stripFrameworkBinary.js';

export const packageIosCommand = curryOptions(
  new Command('package:ios').description('Build iOS XCFramework'),
  getBuildOptions({ platformName: 'ios' }).map((option) =>
    option.name.startsWith('--build-folder')
      ? {
          ...option,
          description:
            option.description +
            " By default, the '.brownfield/build' path will be used.",
        }
      : option
  )
).action(
  actionRunner(async (options: AppleBuildFlags) => {
    const { projectRoot, platformConfig, userConfig } = getProjectInfo('ios');
    await runExpoPrebuildIfNeeded({ projectRoot, platform: 'ios' });

    if (!userConfig.project.ios) {
      throw new Error('iOS project not found.');
    }

    if (!userConfig.project.ios.xcodeProject) {
      throw new Error('iOS Xcode project not found in the configuration.');
    }

    let dotBrownfieldDir = path.join(
      // for Expo projects, platformConfig?.sourceDir == "", but for non-Expo projects, it's "ios"
      ...(userConfig.project.ios.sourceDir.trim().length > 0
        ? [userConfig.project.ios.sourceDir]
        : [projectRoot, 'ios']),
      '.brownfield'
    );

    // non-Expo projects have a relative sourceDir path, so we need to make it absolute
    if (!path.isAbsolute(dotBrownfieldDir)) {
      dotBrownfieldDir = path.join(projectRoot, dotBrownfieldDir);
    }

    options.buildFolder ??= path.join(dotBrownfieldDir, 'build');

    // The new_architecture.rb script scans Info.plist and fails on binary plist files,
    // which is the case for our XCFrameworks.
    // We're reusing the "build" directory which is excluded from the scan.
    // Reference: https://github.com/facebook/react-native/blob/490c5e8dcc6cdb19c334cc39e93a39a48ba71e96/packages/react-native/scripts/cocoapods/new_architecture.rb#L171
    const packageDir = path.join(dotBrownfieldDir, 'package', 'build');
    const configuration = options.configuration ?? 'Debug';

    const { hasBrownie } = await runBrownieCodegenIfApplicable(
      projectRoot,
      'swift'
    );
    runNavigationCodegenIfApplicable(projectRoot);

    await packageIosAction(
      options,
      {
        projectRoot,
        reactNativePath: userConfig.reactNativePath,
        // below: the userConfig.reactNativeVersion may be a non-semver-format string,
        // e.g. '0.82' (note the missing patch component),
        // therefore we resolve it manually from RN's package.json using Rock's utils
        reactNativeVersion: getReactNativeVersion(projectRoot),
        usePrebuiltRNCore: false, // for brownfield, it is required to build RN from source
        packageDir, // the output directory for artifacts
        skipCache: true, // cache is dependent on existence of Rock config file
      },
      platformConfig
    );

    if (hasBrownie) {
      const productsPath = path.join(options.buildFolder, 'Build', 'Products');
      const brownieOutputPath = path.join(packageDir, 'Brownie.xcframework');

      await mergeFrameworks({
        sourceDir: userConfig.project.ios.sourceDir,
        frameworkPaths: [
          path.join(
            productsPath,
            `${configuration}-iphoneos`,
            'Brownie',
            'Brownie.framework'
          ),
          path.join(
            productsPath,
            `${configuration}-iphonesimulator`,
            'Brownie',
            'Brownie.framework'
          ),
        ],
        outputPath: brownieOutputPath,
      });

      // Strip the binary from Brownie.xcframework to make it interface-only.
      // This avoids duplicate symbols when consumer apps embed both BrownfieldLib
      // (which contains Brownie symbols) and Brownie.xcframework.
      stripFrameworkBinary(brownieOutputPath);

      logger.success(
        `Brownie.xcframework created at ${colorLink(relativeToCwd(brownieOutputPath))}`
      );
    }

    const productsPath = path.join(options.buildFolder, 'Build', 'Products');
    const brownfieldNavigationOutputPath = path.join(packageDir, 'BrownfieldNavigation.xcframework');

    await mergeFrameworks({
      sourceDir: userConfig.project.ios.sourceDir,
      frameworkPaths: [
        path.join(
          productsPath,
          `${configuration}-iphoneos`,
          'BrownfieldNavigation',
          'BrownfieldNavigation.framework'
        ),
        path.join(
          productsPath,
          `${configuration}-iphonesimulator`,
          'BrownfieldNavigation',
          'BrownfieldNavigation.framework'
        ),
      ],
      outputPath: brownfieldNavigationOutputPath,
    });

    // Strip the binary from Brownie.xcframework to make it interface-only.
    // This avoids duplicate symbols when consumer apps embed both BrownfieldLib
    // (which contains Brownie symbols) and Brownie.xcframework.
    await stripFrameworkBinary(brownfieldNavigationOutputPath);

    logger.success(
      `BrownfieldNavigation.xcframework created at ${colorLink(relativeToCwd(brownfieldNavigationOutputPath))}`
    );
  })
);

export const packageIosExample = new ExampleUsage(
  'package:ios --scheme BrownfieldLib --configuration Release',
  "Build iOS XCFramework for 'BrownfieldLib' scheme in Release configuration"
);
