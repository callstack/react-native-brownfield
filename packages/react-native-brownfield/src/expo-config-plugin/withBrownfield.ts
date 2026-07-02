import {
  createRunOncePlugin,
  withPlugins,
  type ConfigPlugin,
  type StaticPlugin,
} from '@expo/config-plugins';

import {
  assertNoConfigFilePluginOverlap,
  loadBrownfieldConfig,
  resolveBrownfieldPluginConfig,
} from '@callstack/brownfield-cli/expo-plugin-config';

import { withBrownfieldIos } from './ios/withBrownfieldIos';
import { withBrownfieldAndroid } from './android/withBrownfieldAndroid';
import type {
  BrownfieldPluginConfig,
  ResolvedBrownfieldPluginConfig,
} from './types';

import { Logger } from './logging';

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
  const pluginProps = props ?? {};
  const fileConfig = loadBrownfieldConfig();

  assertNoConfigFilePluginOverlap(fileConfig, pluginProps);

  const resolvedConfig: ResolvedBrownfieldPluginConfig =
    resolveBrownfieldPluginConfig(pluginProps, fileConfig, config);

  Logger.setIsDebug(resolvedConfig.debug);

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
