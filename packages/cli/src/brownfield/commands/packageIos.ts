import fs from 'node:fs';
import path from 'node:path';

import {
  buildApp,
  genericDestinations,
  getBuildOptions,
  getValidProjectConfig,
  type BuildFlags as AppleBuildFlags,
} from '@rock-js/platform-apple-helpers';
import {
  RockError,
  colorLink,
  getReactNativeVersion,
  logger,
  relativeToCwd,
} from '@rock-js/tools';

import { Command, Option } from 'commander';

import { runExpoPrebuildIfNeeded } from '../utils/expo.js';
import { getProjectInfo } from '../utils/project.js';
import { supportsPrebuiltRNCore } from '../utils/supportsPrebuiltRNCore.js';
import {
  actionRunner,
  curryOptions,
  ExampleUsage,
} from '../../shared/index.js';
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { copyDebugBundleToSimulatorSlice } from '../utils/copyDebugBundleToSimulatorSlice.js';
import { resolvePackagedFrameworkName } from '../utils/resolvePackagedFrameworkName.js';
import { sanitizeSwiftInterfaces } from '../utils/sanitizeSwiftInterfaces.js';
import { stripFrameworkBinary } from '../utils/stripFrameworkBinary.js';
import { copyHermesXcframework } from '../utils/copyHermesXcframework.js';
import { copyReactXcframeworks } from '../utils/copyReactXcframeworks.js';
import { mergeStaticLibraryXcframework } from '../utils/mergeStaticLibraryXcframework.js';
import { normalizeLibraryXcframeworkToFramework } from '../utils/normalizeLibraryXcframework.js';
import { mergeFrameworkSlicesManually } from '../utils/mergeFrameworkSlicesManually.js';

/** Help text for `--use-prebuilt-rn-core` (keep in sync with docs/docs/docs/getting-started/ios.mdx, "React Native Prebuilts" section). */
const USE_PREBUILT_RN_CORE_HELP =
  'Whether the Xcode build for packaging should use React Native Apple prebuilt binaries (via CocoaPods). ' +
  'If you omit this flag, Brownfield follows version-aware defaults: for React Native 0.84 and newer, prebuilts are enabled by default; for RN 0.83, they are disabled unless you opt in. ' +
  'Pass true or false to force either behavior. Use the flag without a value as shorthand for true (same as `--use-prebuilt-rn-core true`). ' +
  'See the Brownfield iOS guide for details: https://oss.callstack.com/react-native-brownfield/docs/getting-started/ios#react-native-prebuilts';

export function parseUsePrebuiltRnCoreArgument(
  value: string | boolean
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  throw new RockError(
    `Invalid value for --use-prebuilt-rn-core: expected true or false, received "${value}"`
  );
}

type PackageIosCliFlags = AppleBuildFlags & {
  /** Set when `--use-prebuilt-rn-core` is passed; omitted when the flag is absent (Rock applies RN version defaults). */
  usePrebuiltRnCore?: boolean;
};

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
)
  .addOption(
    new Option('--use-prebuilt-rn-core [bool]', USE_PREBUILT_RN_CORE_HELP)
      .preset(true)
      .argParser(parseUsePrebuiltRnCoreArgument)
  )
  .action(
    actionRunner(async (options: PackageIosCliFlags) => {
      const { projectRoot, platformConfig, userConfig } = getProjectInfo('ios');

      const prebuiltRNCoreSupport = supportsPrebuiltRNCore({ projectRoot });

      // version-aware default when the flag is omitted (see ios.mdx "React Native Prebuilts")
      options.usePrebuiltRnCore ??= prebuiltRNCoreSupport.supported
        ? prebuiltRNCoreSupport.enabledByDefault
        : false;

      if (prebuiltRNCoreSupport) {
        logger.info(
          `${options.usePrebuiltRnCore ? 'Using' : 'Not using'} prebuilt RN core`
        );

        if (
          !prebuiltRNCoreSupport.enabledByDefault &&
          !options.usePrebuiltRnCore
        ) {
          logger.info(
            'Your environment supports prebuilt RN Core as an opt-in feature, but it is disabled by default. Pass --use-prebuilt-rn-core to enable it.'
          );
        }
      }

      if (options.usePrebuiltRnCore && !prebuiltRNCoreSupport.supported) {
        throw new RockError(prebuiltRNCoreSupport.reason);
      }

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
      options.verbose ??= logger.isVerbose();

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
      const { hasNavigation } =
        await runNavigationCodegenIfApplicable(projectRoot);

      const iosConfig = getValidProjectConfig('ios', projectRoot, platformConfig);
      const destination = options.destination ?? [
        genericDestinations.ios.device,
        genericDestinations.ios.simulator,
      ];
      const reactNativeVersion = getReactNativeVersion(projectRoot);

      const { appPath, scheme } = await buildApp({
        projectRoot,
        projectConfig: iosConfig,
        platformName: 'ios',
        args: { ...options, destination, buildFolder: options.buildFolder },
        reactNativePath: userConfig.reactNativePath,
        brownfield: true,
        usePrebuiltRNCore: options.usePrebuiltRnCore,
        pluginConfig: platformConfig,
        skipCache: true,
      });

      logger.log(`Build available at: ${colorLink(relativeToCwd(appPath))}`);

      const productsPath = path.join(options.buildFolder, 'Build', 'Products');
      const frameworkTargetOutputDir =
        path.isAbsolute(packageDir)
          ? packageDir
          : path.join(iosConfig.sourceDir, packageDir);
      fs.mkdirSync(frameworkTargetOutputDir, { recursive: true });

      mergeFrameworkSlicesManually({
        deviceFrameworkPath: path.join(
          productsPath,
          `${configuration}-iphoneos`,
          `${scheme}.framework`
        ),
        frameworkName: scheme!,
        outputPath: path.join(frameworkTargetOutputDir, `${scheme}.xcframework`),
        simulatorFrameworkPath: path.join(
          productsPath,
          `${configuration}-iphonesimulator`,
          `${scheme}.framework`
        ),
      });

      copyHermesXcframework({
        sourceDir: iosConfig.sourceDir,
        destinationDir: frameworkTargetOutputDir,
        reactNativeVersion,
      });

      copyReactXcframeworks({
        sourceDir: iosConfig.sourceDir,
        destinationDir: frameworkTargetOutputDir,
      });

      const packageSupportModule = async (
        supportFrameworkName: string,
        outputPath: string
      ) => {
        const resolveSupportFrameworkPath = (
          sdk: 'iphoneos' | 'iphonesimulator'
        ) => {
          const sdkProductsPath = path.join(
            productsPath,
            `${configuration}-${sdk}`
          );
          const directPath = path.join(
            sdkProductsPath,
            `${supportFrameworkName}.framework`
          );

          if (fs.existsSync(directPath)) {
            return directPath;
          }

          const nestedPath = path.join(
            sdkProductsPath,
            supportFrameworkName,
            `${supportFrameworkName}.framework`
          );

          return fs.existsSync(nestedPath) ? nestedPath : null;
        };

        const deviceFrameworkPath = resolveSupportFrameworkPath('iphoneos');
        const simulatorFrameworkPath =
          resolveSupportFrameworkPath('iphonesimulator');

        if (
          deviceFrameworkPath != null &&
          simulatorFrameworkPath != null
        ) {
          mergeFrameworkSlicesManually({
            deviceFrameworkPath,
            frameworkName: supportFrameworkName,
            outputPath,
            simulatorFrameworkPath,
          });
          return;
        }

        mergeStaticLibraryXcframework({
          sourceDir: iosConfig.sourceDir,
          outputPath,
          frameworkName: supportFrameworkName,
          deviceModuleOutputDir: path.join(
            productsPath,
            `${configuration}-iphoneos`,
            supportFrameworkName
          ),
          simulatorModuleOutputDir: path.join(
            productsPath,
            `${configuration}-iphonesimulator`,
            supportFrameworkName
          ),
        });
        normalizeLibraryXcframeworkToFramework({
          xcframeworkPath: outputPath,
          frameworkName: supportFrameworkName,
        });
      };

      const sanitizePackagedFramework = (
        frameworkPath: string,
        moduleName: string
      ) => {
        sanitizeSwiftInterfaces({
          moduleName,
          rootPath: frameworkPath,
        });
      };

      const { frameworkName, resolution, candidates } =
        resolvePackagedFrameworkName({
          explicitScheme: options.scheme,
          productsPath,
          configuration,
        });

      if (frameworkName) {
        copyDebugBundleToSimulatorSlice({
          productsPath,
          configuration,
          frameworkName,
        });

        if (configuration.includes('Debug')) {
          // Re-merge only Debug frameworks so the simulator slice includes main.jsbundle.
          mergeFrameworkSlicesManually({
            deviceFrameworkPath: path.join(
              productsPath,
              `${configuration}-iphoneos`,
              `${frameworkName}.framework`
            ),
            frameworkName,
            outputPath: path.join(packageDir, `${frameworkName}.xcframework`),
            simulatorFrameworkPath: path.join(
              productsPath,
              `${configuration}-iphonesimulator`,
              `${frameworkName}.framework`
            ),
          });
        }
      } else if (configuration.includes('Debug')) {
        const debugResolutionMessage =
          resolution === 'ambiguous'
            ? `Skipping Debug simulator JS bundle copy: found multiple bundled framework candidates (${candidates?.join(', ') ?? 'none'}); pass --scheme explicitly`
            : 'Skipping Debug simulator JS bundle copy: could not resolve the packaged framework output automatically; pass --scheme explicitly';

        logger.warn(debugResolutionMessage);
      }

      const reactBrownfieldXcframeworkPath = path.join(
        packageDir,
        'ReactBrownfield.xcframework'
      );
      await packageSupportModule(
        'ReactBrownfield',
        reactBrownfieldXcframeworkPath
      );
      if (fs.existsSync(reactBrownfieldXcframeworkPath)) {
        sanitizePackagedFramework(
          reactBrownfieldXcframeworkPath,
          'ReactBrownfield'
        );

        // Strip the binary from ReactBrownfield.xcframework to make it interface-only.
        // This avoids duplicate symbols when consumer apps embed both BrownfieldLib
        // (which contains ReactBrownfield symbols) and ReactBrownfield.xcframework.
        stripFrameworkBinary(reactBrownfieldXcframeworkPath);
      }

      if (hasBrownie) {
        const brownieOutputPath = path.join(packageDir, 'Brownie.xcframework');
        await packageSupportModule('Brownie', brownieOutputPath);

        // Strip the binary from Brownie.xcframework to make it interface-only.
        // This avoids duplicate symbols when consumer apps embed both BrownfieldLib
        // (which contains Brownie symbols) and Brownie.xcframework.
        stripFrameworkBinary(brownieOutputPath);

        logger.success(
          `Brownie.xcframework created at ${colorLink(relativeToCwd(brownieOutputPath))}`
        );
      }

      if (hasNavigation) {
        const brownfieldNavigationOutputPath = path.join(
          packageDir,
          'BrownfieldNavigation.xcframework'
        );
        await packageSupportModule(
          'BrownfieldNavigation',
          brownfieldNavigationOutputPath
        );

        stripFrameworkBinary(brownfieldNavigationOutputPath);

        logger.success(
          `BrownfieldNavigation.xcframework created at ${colorLink(relativeToCwd(brownfieldNavigationOutputPath))}`
        );
      }
    })
  );

export const packageIosExample = new ExampleUsage(
  'package:ios --scheme BrownfieldLib --configuration Release',
  "Build iOS XCFramework for 'BrownfieldLib' scheme in Release configuration"
);
