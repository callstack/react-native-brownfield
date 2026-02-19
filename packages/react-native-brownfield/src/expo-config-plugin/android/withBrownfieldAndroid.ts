import {
  withProjectBuildGradle,
  withSettingsGradle,
  type ConfigPlugin,
} from '@expo/config-plugins';

import { modifyRootBuildGradle, modifySettingsGradle } from './gradleHelpers';
import { withAndroidModuleFiles } from './withAndroidModuleFiles';
import type { ResolvedBrownfieldPluginConfigWithAndroid } from '../types';

/**
 * Android Config Plugin for integration with @callstack/react-native-brownfield.
 *
 * This plugin:
 * 1. Creates a new Android Library module for the Brownfield AAR
 * 3. Modifies settings.gradle to include the new module
 * 4. Modifies root build.gradle to add Brownfield Gradle plugin
 * 5. Generates the ReactNativeHostManager class inside the module
 */
export const withBrownfieldAndroid: ConfigPlugin<
  ResolvedBrownfieldPluginConfigWithAndroid
> = (config, props) => {
  const androidConfig = props.android;

  // Step 1: modify root build.gradle to add Brownfield Gradle plugin dependency
  config = withProjectBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = modifyRootBuildGradle(
      gradleConfig.modResults.contents
    );

    return gradleConfig;
  });

  // Step 2: modify settings.gradle to include the new module
  config = withSettingsGradle(config, (settingsConfig) => {
    settingsConfig.modResults.contents = modifySettingsGradle(
      settingsConfig.modResults.contents,
      androidConfig.moduleName
    );

    return settingsConfig;
  });

  // Step 3: create the Android module files using dangerous mod
  config = withAndroidModuleFiles(config, props);

  return config;
};
