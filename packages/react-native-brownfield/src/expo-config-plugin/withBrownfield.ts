import {
  createRunOncePlugin,
  withPlugins,
  type ConfigPlugin,
  type StaticPlugin,
} from '@expo/config-plugins';
import type { ExpoConfig } from '@expo/config-types';

import { withBrownfieldIos } from './ios/withBrownfieldIos';
import { withBrownfieldAndroid } from './android/withBrownfieldAndroid';
import type {
  BrownfieldPluginConfig,
  ResolvedBrownfieldPluginConfig,
} from './types';

import { Logger } from './logging';

/**
 * Resolves the plugin configuration using provided config and config defaults.
 * @param config The user-provided Brownfield configuration.
 * @param expoConfig The Expo configuration object.
 * @returns The resolved Brownfield configuration.
 */
function resolveConfig(
  config: BrownfieldPluginConfig = {},
  expoConfig: ExpoConfig
): ResolvedBrownfieldPluginConfig {
  Logger.setIsDebug(config.debug ?? false);

  const androidPackage = expoConfig.android?.package;
  const androidModuleName = config.android?.moduleName ?? 'brownfield';

  return {
    ios: expoConfig.ios
      ? {
          frameworkName: config.ios?.frameworkName ?? 'App',
          bundleIdentifier:
            config.ios?.bundleIdentifier ??
            `${expoConfig.ios.bundleIdentifier}.brownfield`,
          buildSettings: config.ios?.buildSettings ?? {},
          deploymentTarget: config.ios?.deploymentTarget ?? '15.0',
          frameworkVersion: config.ios?.frameworkVersion ?? '1',
        }
      : null,
    android: androidPackage
      ? {
          moduleName: androidModuleName,
          packageName: config.android?.packageName ?? androidPackage,
          minSdkVersion: config.android?.minSdkVersion ?? 24,
          targetSdkVersion: config.android?.targetSdkVersion ?? 35,
          compileSdkVersion: config.android?.compileSdkVersion ?? 35,
          groupId: config.android?.groupId ?? androidPackage,
          artifactId: config.android?.artifactId ?? androidModuleName,
          version: config.android?.version ?? '0.0.1-SNAPSHOT',
        }
      : null,
    debug: config.debug ?? false,
  };
}

/**
 * React Native Brownfield - Expo Config Plugin.
 *
 * This plugin configures your Expo project to be packaged as:
 * - iOS: XCFramework that can be integrated into native iOS apps
 * - Android: AAR that can be integrated into native Android apps
 *
 * The plugin modifies the native project files during expo prebuild.
 *
 * @example
 * ```json
 * // app.json
 * {
 *   "expo": {
 *     "plugins": [
 *       ["@callstack/react-native-brownfield", {
 *         "ios": {
 *           "frameworkName": "MyReactNativeApp"
 *         },
 *         "android": {
 *           "moduleName": "myreactnativeapp"
 *         }
 *       }]
 *     ]
 *   }
 * }
 * ```
 */
const withBrownfield: ConfigPlugin<BrownfieldPluginConfig | void> = (
  config,
  props = {}
) => {
  const resolvedConfig = resolveConfig(props ?? {}, config);

  const plugins: (ConfigPlugin | StaticPlugin)[] = [];

  if (resolvedConfig.ios) {
    plugins.push([withBrownfieldIos, resolvedConfig]);
  }

  if (resolvedConfig.android) {
    plugins.push([withBrownfieldAndroid, resolvedConfig]);
  }

  return withPlugins(config, plugins);
};

export default createRunOncePlugin(
  withBrownfield,
  process.env.npm_package_name as string,
  process.env.npm_package_version as string
);
