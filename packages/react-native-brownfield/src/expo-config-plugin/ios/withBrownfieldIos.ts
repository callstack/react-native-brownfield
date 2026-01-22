import {
  withXcodeProject,
  withPodfile,
  type ConfigPlugin,
} from '@expo/config-plugins';

import { addFrameworkTarget } from './xcodeHelpers';
import { modifyPodfile } from './podfileHelpers';
import { withIosFrameworkFiles } from './withIosFrameworkFiles';
import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';
import { log } from '../logging';

/**
 * iOS Config Plugin for brownfield integration.
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
  // Step 1: modify the Xcode project to add framework target
  config = withXcodeProject(config, (xcodeConfig) => {
    const { modResults: project } = xcodeConfig;
    const { frameworkName } = props.ios;

    if (props.debug) {
      log(`Adding iOS framework target: ${frameworkName}`);
    }

    addFrameworkTarget(project, props.ios);

    return xcodeConfig;
  });

  // Step 2: modify Podfile to include the framework target
  config = withPodfile(config, (podfileConfig) => {
    const { frameworkName } = props.ios;

    if (props.debug) {
      log(`Modifying Podfile for framework: ${frameworkName}`);
    }

    podfileConfig.modResults.contents = modifyPodfile(
      podfileConfig.modResults.contents,
      frameworkName
    );

    return podfileConfig;
  });

  // Step 3: create the iOS framework files using dangerous mod
  config = withIosFrameworkFiles(config, props);

  return config;
};
