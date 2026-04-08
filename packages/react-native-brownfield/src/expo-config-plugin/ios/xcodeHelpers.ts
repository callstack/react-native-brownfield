import path from 'node:path';

import {
  type ModProps,
  type XcodeProject,
  IOSConfig,
} from '@expo/config-plugins';

import { Logger } from '../logging';
import type { ResolvedBrownfieldPluginIosConfig } from '../types';
import { SourceModificationError } from '../errors/SourceModificationError';
import { getFrameworkSourceFiles } from './withIosFrameworkFiles';
import { renderTemplate } from '../template/engine';

/**
 * Adds a new Framework target to the Xcode project for Brownfield packaging
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
  targetAlreadyExists: boolean;
} {
  const { frameworkName, bundleIdentifier } = options;

  // check if target already exists
  const existingTarget = project.pbxTargetByName(frameworkName);
  if (existingTarget) {
    Logger.logDebug(
      `Framework target "${frameworkName}" already exists, skipping creation`
    );

    const frameworkTargetUUID = Object.entries(
      project.pbxNativeTargetSection()
    ).find(
      ([_key, value]) =>
        (value as any)?.productReference === existingTarget.productReference
    )?.[0];

    if (!frameworkTargetUUID) {
      throw new SourceModificationError(
        `Failed to find framework target UUID for ${frameworkName}, although it can be resolved by name`
      );
    }

    return {
      frameworkTargetUUID,
      targetAlreadyExists: true,
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
    targetAlreadyExists: false,
  };
}

export function addSourceFilesBuildPhase(
  project: XcodeProject,
  frameworkTargetUUID: string,
  options: ResolvedBrownfieldPluginIosConfig
) {
  const filePaths = getFrameworkSourceFiles(options).map(
    (file) => file.relativePath
  );

  const sourceFiles = filePaths.filter(
    (filePath) => !filePath.endsWith('.plist')
  );

  project.addBuildPhase(
    sourceFiles,
    'PBXSourcesBuildPhase',
    options.frameworkName,
    frameworkTargetUUID,
    'framework',
    '""'
  );
}

function normalizePbxString(value: unknown): string {
  return String(value ?? '').replace(/^"(.*)"$/, '$1');
}

function findSupportingGroupUuid(project: XcodeProject): string | null {
  const groups = (project as any).hash?.project?.objects?.PBXGroup;
  if (!groups) {
    return null;
  }

  for (const [groupUuid, group] of Object.entries(groups)) {
    if (groupUuid.endsWith('_comment')) {
      continue;
    }

    const groupName = normalizePbxString((group as any)?.name);
    const groupPath = normalizePbxString((group as any)?.path);

    if (groupName === 'Supporting' || groupPath.endsWith('/Supporting')) {
      return groupUuid;
    }
  }

  return null;
}

function getOrCreateExpoPlistFileReference(project: XcodeProject): string {
  const fileReferences = project.pbxFileReferenceSection() as Record<
    string,
    any
  >;
  const normalizedTargetPath = 'Supporting/Expo.plist';

  let fallbackExpoPlistFileRefUuid: string | null = null;

  for (const [fileRefUuid, fileRef] of Object.entries(fileReferences)) {
    if (fileRefUuid.endsWith('_comment')) {
      continue;
    }

    const filePath = normalizePbxString((fileRef as any)?.path);
    const fileName = normalizePbxString((fileRef as any)?.name);
    const normalizedPath = filePath.replace(/^\.\//, '');

    if (
      normalizedPath === normalizedTargetPath ||
      normalizedPath.endsWith(`/${normalizedTargetPath}`)
    ) {
      return fileRefUuid;
    }

    if (
      !fallbackExpoPlistFileRefUuid &&
      (normalizedPath === 'Expo.plist' || fileName === 'Expo.plist')
    ) {
      fallbackExpoPlistFileRefUuid = fileRefUuid;
    }
  }

  if (fallbackExpoPlistFileRefUuid) {
    return fallbackExpoPlistFileRefUuid;
  }

  const supportingGroupUuid = findSupportingGroupUuid(project);
  if (!supportingGroupUuid) {
    throw new SourceModificationError(
      'Could not find the "Supporting" PBXGroup needed for Expo.plist resource wiring'
    );
  }

  const fileRefUuid = (project as any).generateUuid();
  fileReferences[fileRefUuid] = {
    isa: 'PBXFileReference',
    fileEncoding: 4,
    lastKnownFileType: 'text.plist.xml',
    path: 'Expo.plist',
    sourceTree: '"<group>"',
  };
  fileReferences[`${fileRefUuid}_comment`] = 'Expo.plist';

  const groups = (project as any).hash?.project?.objects?.PBXGroup as
    | Record<string, any>
    | undefined;
  const supportingGroup = groups?.[supportingGroupUuid];
  if (supportingGroup) {
    const children = Array.isArray(supportingGroup.children)
      ? supportingGroup.children
      : [];

    const hasExpoPlistChild = children.some((child: any) => {
      if (typeof child === 'string') {
        return child === fileRefUuid;
      }

      return child?.value === fileRefUuid;
    });

    if (!hasExpoPlistChild) {
      children.push({
        value: fileRefUuid,
        comment: 'Expo.plist',
      });
      supportingGroup.children = children;
    }
  }

  Logger.logDebug('Created PBXFileReference for Supporting/Expo.plist');

  return fileRefUuid;
}

/**
 * Ensures the framework target contains the app-level Supporting/Expo.plist in
 * PBXResourcesBuildPhase. This is idempotent and safe to call repeatedly.
 */
export function ensureFrameworkHasExpoPlistResource(
  project: XcodeProject,
  frameworkTargetUUID: string
): void {
  const nativeTargets = (project as any).hash?.project?.objects
    ?.PBXNativeTarget as Record<string, any> | undefined;
  const frameworkTarget = nativeTargets?.[frameworkTargetUUID];
  if (!frameworkTarget) {
    throw new SourceModificationError(
      `Framework target UUID "${frameworkTargetUUID}" not found while wiring Expo.plist as a resource`
    );
  }

  const resourceBuildPhases =
    (project as any).hash?.project?.objects?.PBXResourcesBuildPhase ?? {};
  const resourcesBuildPhaseUuid = (frameworkTarget.buildPhases ?? [])
    .map((phase: { value?: string } | string) =>
      typeof phase === 'string' ? phase : phase?.value
    )
    .find(
      (phaseUuid: string | undefined) =>
        !!phaseUuid && !!resourceBuildPhases[phaseUuid]
    );

  let resolvedResourcesBuildPhaseUuid = resourcesBuildPhaseUuid;
  if (!resolvedResourcesBuildPhaseUuid) {
    // Some existing projects can have a framework target without an explicit
    // resources phase. Create one so Expo.plist can be added safely.
    resolvedResourcesBuildPhaseUuid = (project as any).generateUuid();
    resourceBuildPhases[resolvedResourcesBuildPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    resourceBuildPhases[`${resolvedResourcesBuildPhaseUuid}_comment`] =
      'Resources';

    const targetBuildPhases = Array.isArray(frameworkTarget.buildPhases)
      ? frameworkTarget.buildPhases
      : [];
    targetBuildPhases.push({
      value: resolvedResourcesBuildPhaseUuid,
      comment: 'Resources',
    });
    frameworkTarget.buildPhases = targetBuildPhases;

    Logger.logDebug(
      `Created missing PBXResourcesBuildPhase for framework target "${frameworkTargetUUID}"`
    );
  }

  const expoPlistFileRefUuid = getOrCreateExpoPlistFileReference(project);
  const resourcesBuildPhase =
    resourceBuildPhases[resolvedResourcesBuildPhaseUuid];
  const buildFileSection = project.pbxBuildFileSection() as Record<string, any>;
  const files = Array.isArray(resourcesBuildPhase.files)
    ? resourcesBuildPhase.files
    : [];

  const hasExpoPlistResource = files.some(
    (phaseFile: { value?: string } | string) => {
      const buildFileUuid =
        typeof phaseFile === 'string' ? phaseFile : phaseFile?.value;
      if (!buildFileUuid) {
        return false;
      }

      return buildFileSection[buildFileUuid]?.fileRef === expoPlistFileRefUuid;
    }
  );

  if (hasExpoPlistResource) {
    Logger.logDebug(
      'Framework resources already include Supporting/Expo.plist'
    );
    return;
  }

  const buildFileUuid = (project as any).generateUuid();
  buildFileSection[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: expoPlistFileRefUuid,
  };
  buildFileSection[`${buildFileUuid}_comment`] = 'Expo.plist in Resources';

  files.push({
    value: buildFileUuid,
    comment: 'Expo.plist in Resources',
  });
  resourcesBuildPhase.files = files;

  Logger.logDebug(
    'Added Supporting/Expo.plist to framework PBXResourcesBuildPhase'
  );
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

function resolveAppTargetName(
  project: XcodeProject,
  modRequest: ModProps<XcodeProject>
): string | null {
  const appTargets = IOSConfig.Target.getNativeTargets(project)
    .map(([, target]) => {
      if (
        !IOSConfig.Target.isTargetOfType(
          target,
          IOSConfig.Target.TargetType.APPLICATION
        )
      ) {
        return null;
      }

      const name = IOSConfig.XcodeUtils.unquote(target.name ?? '').trim();

      return name ?? null;
    })
    .filter((name): name is string => !!name);

  // 1) Unambiguous first application-type target
  if (appTargets.length === 1) {
    return appTargets[0];
  } else {
    Logger.logWarning(
      'Multiple application targets found in the Xcode project. Falling back to the CNG-derived name from mod compiler.'
    );
  }

  // 2) CNG-derived name from mod compiler (`modRequest.projectName`) - only if it exists in the filtered application-type list of Xcode project targets
  const cngDerivedProjectName = modRequest.projectName;
  if (cngDerivedProjectName && appTargets.includes(cngDerivedProjectName)) {
    return cngDerivedProjectName;
  } else {
    Logger.logWarning(
      'CNG-derived name from mod compiler is not set or is not an application target. Falling back to the unfiltered-type target name.'
    );
  }

  // 3) PBX "first native target" fallback
  try {
    const [, firstAppTarget] = IOSConfig.Target.findFirstNativeTarget(project);
    const name = IOSConfig.XcodeUtils.unquote(firstAppTarget.name ?? '').trim();
    return name || null;
  } catch {
    Logger.logWarning(
      'No first native target of any type found in the Xcode project. This was the last resort fallback.'
    );
  }

  Logger.logError(
    `Could not determine the iOS app target name from the Xcode project. Please adjust your Xcode project to have exactly one application target.`
  );

  return null;
}

export function addExpoPre55ShellPatchScriptPhase(
  modRequest: ModProps<XcodeProject>,
  project: XcodeProject,
  {
    frameworkName,
    frameworkTargetUUID,
  }: {
    frameworkName: string;
    frameworkTargetUUID: string;
  }
) {
  const resolvedAppTargetName = resolveAppTargetName(project, modRequest);

  Logger.logInfo(`Resolved iOS app target name: ${resolvedAppTargetName}`);

  if (!resolvedAppTargetName) {
    throw new SourceModificationError(
      `Could not determine the iOS app target name from the Xcode project.`
    );
  }

  project.addBuildPhase(
    [
      // no associated files
    ],
    'PBXShellScriptBuildPhase',
    'Patch ExpoModulesProvider',
    frameworkTargetUUID,
    {
      shellPath: '/bin/sh',
      shellScript: renderTemplate('ios', 'patchExpoPre55.sh', {
        '{{APP_TARGET_NAME}}': resolvedAppTargetName,
        '{{FRAMEWORK_NAME}}': frameworkName,
      }),
    }
  );
}

/**
 * Makes sure the patch expo modules provider phase is after the expo configure phase,
 * otherwise the patched file would be overwritten by the expo configure phase
 * @param project The Xcode project
 * @param frameworkTargetUUID The UUID of the framework target
 * @returns True if the build phases were modified, false otherwise
 */
export function ensureExpoPre55ShellPatchScriptPhaseIsOrdered(
  project: XcodeProject,
  frameworkTargetUUID: string
) {
  let modified = false;
  const nativeTargetSection = project.pbxNativeTargetSection();

  const buildPhases: { value: string; comment?: string }[] =
    nativeTargetSection[frameworkTargetUUID].buildPhases;

  const expoConfigurePhaseIndex = buildPhases.findIndex(
    (phase) =>
      (phase as any)?.comment?.toLowerCase() ===
      '[Expo] Configure project'.toLowerCase()
  );

  const patchExpoModulesProviderPhaseIndex = buildPhases.findIndex(
    (phase) =>
      (phase as any)?.comment?.toLowerCase() ===
      'Patch ExpoModulesProvider'.toLowerCase()
  );

  // ensure patch expo modules provider phase is after expo configure phase
  if (patchExpoModulesProviderPhaseIndex < expoConfigurePhaseIndex) {
    const element = buildPhases.splice(
      patchExpoModulesProviderPhaseIndex,
      1
    )[0]; // pop the element at patchExpoModulesProviderPhaseIndex
    buildPhases.splice(expoConfigurePhaseIndex, 0, element); // insert the element at expoConfigurePhaseIndex ("after")
    modified = true;
  }

  nativeTargetSection[frameworkTargetUUID].buildPhases = buildPhases;

  project.writeSync();

  return modified;
}
