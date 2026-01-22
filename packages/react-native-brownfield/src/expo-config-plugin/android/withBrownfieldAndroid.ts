import {
  withProjectBuildGradle,
  withSettingsGradle,
  type ConfigPlugin,
} from '@expo/config-plugins';

import { modifyRootBuildGradle, modifySettingsGradle } from './gradleHelpers';
import { withAndroidModuleFiles } from './withAndroidModuleFiles';
import type { ResolvedBrownfieldPluginConfigWithAndroid } from '../types';
import { log } from '../logging';

/**
 * Android Config Plugin for brownfield integration.
 *
 * This plugin:
 * 1. Creates a new Android Library module for the brownfield AAR
 * 2. Configures the brownfield Gradle plugin
 * 3. Sets up React Native dependencies
 * 4. Generates the ReactNativeHostManager helper class
 * 5. Configures Maven publishing for the AAR
 */
export const withBrownfieldAndroid: ConfigPlugin<
  ResolvedBrownfieldPluginConfigWithAndroid
> = (config, props) => {
  const androidConfig = props.android;

  // Step 1: Modify root build.gradle to add brownfield plugin dependency
  config = withProjectBuildGradle(config, (gradleConfig) => {
    if (props.debug) {
      log(`Modifying root build.gradle for brownfield plugin`);
    }

    gradleConfig.modResults.contents = modifyRootBuildGradle(
      gradleConfig.modResults.contents
    );

    return gradleConfig;
  });

  // Step 2: Modify settings.gradle to include the new module
  config = withSettingsGradle(config, (settingsConfig) => {
    if (props.debug) {
      log(
        `Modifying settings.gradle to include module: ${androidConfig.moduleName}`
      );
    }

    settingsConfig.modResults.contents = modifySettingsGradle(
      settingsConfig.modResults.contents,
      androidConfig.moduleName
    );

    return settingsConfig;
  });

  // Step 3: Create the Android module files using dangerous mod
  config = withAndroidModuleFiles(config, props);

  return config;
};

/**
 * Export helper functions for use in custom configurations
 */
export {
  getModuleBuildGradle,
  modifyRootBuildGradle,
  modifySettingsGradle,
} from './gradleHelpers';

export {
  generateReactNativeHostManager,
  getExpoHostManagerContent,
} from './hostManagerGenerator';
