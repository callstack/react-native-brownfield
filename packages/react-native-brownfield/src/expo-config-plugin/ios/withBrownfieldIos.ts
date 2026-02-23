import {
  withXcodeProject,
  withPodfile,
  type ConfigPlugin,
} from '@expo/config-plugins';

import {
  addExpoPre55ShellPatchScriptPhase,
  addFrameworkTarget,
  addSourceFilesBuildPhase,
  copyBundleReactNativePhase,
} from './xcodeHelpers';
import { modifyPodfile } from './podfileHelpers';
import { withIosFrameworkFiles } from './withIosFrameworkFiles';
import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';
import { Logger } from '../logging';

/**
 * iOS Config Plugin for integration with @callstack/react-native-brownfield.
 *
 * This plugin:
 * 1. Creates a new Framework target in the Xcode project
 * 2. Configures the Podfile to include the framework target
 * 3. Adds necessary build configuration
 * 4. Adds script phase to patch `ExpoModulesProvider.swift`
 * 5. Adds the "Bundle React Native code and images" phase of Expo app target to the framework target
 */
export const withBrownfieldIos: ConfigPlugin<
  ResolvedBrownfieldPluginConfigWithIos
> = (config, props) => {
  const expoMajor = config.sdkVersion
    ? parseInt(config.sdkVersion.split('.')[0], 10)
    : -1;
  const isExpoPre55 = expoMajor < 55;
  // Step 1: modify the Xcode project to add framework target &
  config = withXcodeProject(config, (xcodeConfig) => {
    const { modResults: project, modRequest } = xcodeConfig;

    const { frameworkTargetUUID, targetAlreadyExists } = addFrameworkTarget(
      project,
      modRequest,
      props.ios
    );

    if (targetAlreadyExists) {
      Logger.logDebug(
        `Skipping further Xcode modifications as framework target was already present`
      );

      return xcodeConfig;
    }

    // copy the "Bundle React Native code and images" build phase from the main target to the framework target
    copyBundleReactNativePhase(project, frameworkTargetUUID);

    // for Expo SDK versions < 55, add a script phase to patch ExpoModulesProvider.swift
    if (isExpoPre55) {
      Logger.logDebug(
        `Adding ExpoModulesProvider patch phase for Expo SDK ${config.sdkVersion}`
      );

      addExpoPre55ShellPatchScriptPhase(modRequest, project, {
        frameworkName: props.ios.frameworkName,
        frameworkTargetUUID: frameworkTargetUUID,
      });
    } else {
      Logger.logDebug(
        `Skipping ExpoModulesProvider patch phase for Expo SDK ${config.sdkVersion}`
      );
    }

    addSourceFilesBuildPhase(project, frameworkTargetUUID, props.ios);

    return xcodeConfig;
  });

  // Step 2: modify Podfile to include the framework target
  config = withPodfile(config, (podfileConfig) => {
    const { frameworkName } = props.ios;

    podfileConfig.modResults.contents = modifyPodfile(
      podfileConfig.modResults.contents,
      frameworkName,
      isExpoPre55
    );

    return podfileConfig;
  });

  // Step 3: create the iOS framework files using dangerous mod
  config = withIosFrameworkFiles(config, props);

  return config;
};
