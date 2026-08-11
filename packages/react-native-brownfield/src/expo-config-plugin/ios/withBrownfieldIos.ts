import {
  withXcodeProject,
  withPodfile,
  type ConfigPlugin,
} from '@expo/config-plugins';

import {
  addFrameworkTarget,
  addSourceFilesBuildPhase,
  copyBundleReactNativePhase,
  resolveFrameworkDeploymentTarget,
} from './xcodeHelpers';
import { modifyPodfile } from './podfileHelpers';
import { injectFmtFixIntoPodfile } from './withFmtFix';
import { ensureFrameworkHasExpoPlistResource } from './utils/expo-updates';
import { withIosFrameworkFiles } from './withIosFrameworkFiles';
import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';
import { Logger } from '../logging';
import { getExpoInfo, hasExpoUpdatesInstalled } from '../expoUtils';

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
  const { expoMajor } = getExpoInfo(config);

  // Step 1: modify the Xcode project to add framework target &
  config = withXcodeProject(config, (xcodeConfig) => {
    const { modResults: project, modRequest } = xcodeConfig;
    const hasExpoUpdates = hasExpoUpdatesInstalled(modRequest.projectRoot);
    const iosProps = {
      ...props.ios,
      deploymentTarget: resolveFrameworkDeploymentTarget(project, modRequest, {
        fallbackDeploymentTarget: props.ios.deploymentTarget,
      }),
    };

    const { frameworkTargetUUID, targetAlreadyExists } = addFrameworkTarget(
      project,
      modRequest,
      iosProps
    );

    // Ensure Expo.plist is present in the framework resources phase when
    // expo-updates is installed, including for pre-existing framework targets.
    if (hasExpoUpdates) {
      ensureFrameworkHasExpoPlistResource(project, frameworkTargetUUID);
    } else {
      Logger.logDebug(
        'Skipping Expo.plist framework resource wiring because expo-updates is not installed'
      );
    }

    if (targetAlreadyExists) {
      Logger.logDebug(
        `Framework target already present, syncing Brownfield build phases`
      );

      copyBundleReactNativePhase(project, frameworkTargetUUID);

      return xcodeConfig;
    }

    // copy the "Bundle React Native code and images" build phase from the main target to the framework target
    copyBundleReactNativePhase(project, frameworkTargetUUID);

    addSourceFilesBuildPhase(project, frameworkTargetUUID, iosProps);

    return xcodeConfig;
  });

  // Step 2: modify Podfile to include the framework target
  config = withPodfile(config, (podfileConfig) => {
    const { frameworkName } = props.ios;

    const modifiedPodfile = modifyPodfile(
      podfileConfig.modResults.contents,
      frameworkName,
      expoMajor
    );
    podfileConfig.modResults.contents =
      injectFmtFixIntoPodfile(modifiedPodfile);

    return podfileConfig;
  });

  // Step 3: create the iOS framework files using dangerous mod
  config = withIosFrameworkFiles(config, props);

  return config;
};
