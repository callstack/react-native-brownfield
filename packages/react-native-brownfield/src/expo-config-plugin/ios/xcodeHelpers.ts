import path from 'node:path';

import type { ModProps, XcodeProject } from '@expo/config-plugins';
import { Logger } from '../logging';
import type { ResolvedBrownfieldPluginIosConfig } from '../types';
import { SourceModificationError } from '../errors/SourceModificationError';
import { getFrameworkSourceFiles } from './withIosFrameworkFiles';
import { renderTemplate } from '../template/engine';

/**
 * Adds a new Framework target to the Xcode project for brownfield packaging
 * @throws If target creation fails
 * @param project The Xcode project to modify
 * @param options Framework target options
 */
export function addFrameworkTarget(
  project: XcodeProject,
  modRequest: ModProps<XcodeProject>,
  options: ResolvedBrownfieldPluginIosConfig
): {
  frameworkTargetUUID: string;
  newlyAdded: boolean;
} {
  const { frameworkName, bundleIdentifier } = options;

  // check if target already exists
  const existingTarget = project.pbxTargetByName(frameworkName);
  if (existingTarget) {
    Logger.logDebug(
      `Framework target "${frameworkName}" already exists, skipping creation`
    );

    return {
      frameworkTargetUUID: existingTarget.uuid,
      newlyAdded: false,
    };
  }

  Logger.logDebug(`Adding iOS framework target: ${frameworkName}`);

  // create the framework target using 'framework' target type
  const frameworkTarget = project.addTarget(
    frameworkName,
    'framework',
    frameworkName,
    bundleIdentifier
  );

  if (!frameworkTarget) {
    throw new SourceModificationError(
      `Failed to create framework target: ${frameworkName}`
    );
  }

  // get the target UUID for later use
  // const targetUuid = frameworkTarget.uuid;
  const frameworkBuildConfigurations =
    project.pbxXCConfigurationList()[
      frameworkTarget.pbxNativeTarget.buildConfigurationList
    ];
  const debugFrameworkConfigKey: string =
    frameworkBuildConfigurations.buildConfigurations.find(
      ({ comment }: { comment: string }) => comment === 'Debug'
    ).value;
  const releaseFrameworkConfigKey: string =
    frameworkBuildConfigurations.buildConfigurations.find(
      ({ comment }: { comment: string }) => comment === 'Release'
    ).value;

  // update build settings on the existing configuration list
  const debugSettings = getFrameworkBuildSettings(
    {
      configuration: 'Debug',
    },
    options
  );
  const releaseSettings = getFrameworkBuildSettings(
    {
      configuration: 'Release',
    },
    options
  );

  var configs = project.pbxXCBuildConfigurationSection();

  // look for existing configs for the framework target
  for (const configName in configs) {
    let sourceBuildSettings =
      configName === releaseFrameworkConfigKey
        ? releaseSettings
        : configName === debugFrameworkConfigKey
          ? debugSettings
          : null;

    // if we have matching settings, apply them
    if (sourceBuildSettings) {
      const destinationBuildSettings = configs[configName].buildSettings;
      for (const key in sourceBuildSettings) {
        destinationBuildSettings[key] = sourceBuildSettings[key];
      }

      Logger.logDebug(
        `Updated build settings for ${configName} configuration of target ${frameworkName}`
      );
    }
  }

  // Update build settings for the target
  Object.entries(debugSettings).forEach(([key, value]) => {
    project.updateBuildProperty(key, value, 'Debug', frameworkName);
  });
  Object.entries(releaseSettings).forEach(([key, value]) => {
    project.updateBuildProperty(key, value, 'Release', frameworkName);
  });

  // create the framework group in the project
  const filePaths = getFrameworkSourceFiles(options).map(
    (file) => file.relativePath
  );
  const groupPath = path.join(modRequest.platformProjectRoot, frameworkName);

  Logger.logDebug(
    `Creating PBX group '${frameworkName}' under path '${groupPath}' with files: ${filePaths.join(', ')}`
  );

  const frameworkGroup = project.addPbxGroup(
    filePaths,
    frameworkName,
    groupPath
  );

  // add the group to the main group using the proper API
  const mainGroupKey = project.getFirstProject().firstProject.mainGroup;
  project.addToPbxGroup(frameworkGroup.uuid, mainGroupKey);

  Logger.logInfo(`Successfully added framework target: ${frameworkName}`);

  return {
    frameworkTargetUUID: frameworkTarget.uuid,
    newlyAdded: true,
  };
}

/**
 * Returns build settings for the framework target
 * @param options The user configuration
 * @returns Build settings object
 */
function getFrameworkBuildSettings(
  {
    configuration,
  }: {
    /** Build configuration name ("Debug" or "Release") */
    configuration: 'Debug' | 'Release';
  },
  {
    bundleIdentifier,
    deploymentTarget,
    frameworkName,
    frameworkVersion,
    buildSettings: customBuildSettings,
  }: ResolvedBrownfieldPluginIosConfig
): Record<string, string | boolean | number> {
  const isDebug = configuration === 'Debug';

  return {
    // settings required as per https://oss.callstack.com/react-native-brownfield/docs/getting-started/ios#required-build-settings
    BUILD_LIBRARY_FOR_DISTRIBUTION: 'YES',
    USER_SCRIPT_SANDBOXING: 'NO',
    SKIP_INSTALL: 'NO',
    ENABLE_MODULE_VERIFIER: 'NO',

    // basic settings
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,

    // Swift settings - use modern Swift version (5.0+) to avoid legacy Swift 3.x migration prompts
    SWIFT_VERSION: '5.0',
    TARGETED_DEVICE_FAMILY: `"1,2"`,
    INFOPLIST_FILE: `${frameworkName}/Info.plist`,
    CURRENT_PROJECT_VERSION: `"${frameworkVersion}"`,
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SWIFT_OPTIMIZATION_LEVEL: isDebug ? '-Onone' : '-O',

    // custom build settings
    ...customBuildSettings,
  };
}

/**
 * Finds the "Bundle React Native code and images" build phase from the main app target
 * and adds it to the framework target's build phases
 * @param project The Xcode project
 * @param targetUuid The UUID of the framework target
 */
export function copyBundleReactNativePhase(
  project: XcodeProject,
  targetUuid: string
): void {
  const buildPhaseName = 'Bundle React Native code and images';

  // Find the existing shell script build phase
  const shellScriptPhases =
    project.hash.project.objects.PBXShellScriptBuildPhase;
  if (!shellScriptPhases) {
    throw new SourceModificationError(
      `No shell script build phases found, skipping ${buildPhaseName}`
    );
  }

  // find the phase by name
  let existingPhaseUuid: string | null = null;
  for (const key of Object.keys(shellScriptPhases)) {
    if (key.endsWith('_comment')) continue;
    const phase = shellScriptPhases[key];
    if (phase.name === `"${buildPhaseName}"` || phase.name === buildPhaseName) {
      existingPhaseUuid = key;
      break;
    }
  }

  if (!existingPhaseUuid) {
    throw new SourceModificationError(
      `Could not find "${buildPhaseName}" build phase, skipping`
    );
  }

  // add the phase reference to the framework target's buildPhases array
  const nativeTargets = project.hash.project.objects.PBXNativeTarget;
  if (nativeTargets && nativeTargets[targetUuid]) {
    const target = nativeTargets[targetUuid];
    if (target.buildPhases) {
      // check if phase is already added
      if (
        !target.buildPhases.some(
          (phase: { value: string }) => phase.value === existingPhaseUuid
        )
      ) {
        target.buildPhases.push({
          value: existingPhaseUuid,
          comment: buildPhaseName,
        });

        Logger.logDebug(
          `Added "${buildPhaseName}" build phase to framework target ${target.name}`
        );
      }
    }
  }
}

export function addExpoPre55ShellPatchScriptPhase(
  project: XcodeProject,
  frameworkTargetUUID: string
) {
  project.addBuildPhase(
    [
      // no associated files
    ],
    'PBXShellScriptBuildPhase',
    'Patch ExpoModulesProvider',
    frameworkTargetUUID,
    {
      shellPath: '/bin/sh',
      shellScript: renderTemplate('ios', 'patchExpoPre55.sh'),
    }
  );
}
