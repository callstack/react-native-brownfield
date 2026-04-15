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

type PbxFileReference = {
  [key: string]: unknown;
  name?: string;
  path?: string;
};

const EXPO_PLIST_FILE_NAME = 'Expo.plist';
const EXPO_PLIST_PRIMARY_RELATIVE_PATH = 'Supporting/Expo.plist';

function normalizePbxPathLike(value: unknown): string {
  return normalizePbxString(value).replace(/^\.\//, '');
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

function isPrimaryExpoPlistMatch(fileRef: PbxFileReference): boolean {
  const normalizedPath = normalizePbxPathLike(fileRef.path);

  return (
    normalizedPath === EXPO_PLIST_PRIMARY_RELATIVE_PATH ||
    normalizedPath.endsWith(`/${EXPO_PLIST_PRIMARY_RELATIVE_PATH}`)
  );
}

function isFallbackExpoPlistMatch(fileRef: PbxFileReference): boolean {
  const normalizedPath = normalizePbxPathLike(fileRef.path);
  const fileName = normalizePbxString(fileRef.name);

  return (
    normalizedPath === EXPO_PLIST_FILE_NAME || fileName === EXPO_PLIST_FILE_NAME
  );
}

/**
 * Selects an existing PBXFileReference for the app-level Expo plist.
 *
 * Matching rules are intentionally ordered:
 * - first prefer `Supporting/Expo.plist` (including nested project-relative paths)
 * - otherwise fall back to the first loose `Expo.plist` match by `path` or `name`
 */
export function selectExpoPlistFileReference(
  fileReferences: Record<string, PbxFileReference | string>
): string | null {
  let fallbackExpoPlistFileRefUuid: string | null = null;

  for (const [fileRefUuid, fileRef] of Object.entries(fileReferences)) {
    if (fileRefUuid.endsWith('_comment') || typeof fileRef === 'string') {
      continue;
    }

    if (isPrimaryExpoPlistMatch(fileRef)) {
      return fileRefUuid;
    }

    if (!fallbackExpoPlistFileRefUuid && isFallbackExpoPlistMatch(fileRef)) {
      fallbackExpoPlistFileRefUuid = fileRefUuid;
    }
  }

  return fallbackExpoPlistFileRefUuid;
}

/**
 * Resolves the PBXFileReference UUID for the app-level `Expo.plist`.
 *
 * Current responsibilities:
 * - select an existing `PBXFileReference`, preferring `Supporting/Expo.plist`
 *   over the first loose `Expo.plist` fallback by `path` or `name`
 * - create a new `PBXFileReference` under the `Supporting` PBXGroup when no
 *   existing reference can be reused
 * - ensure the new file reference is linked from the `Supporting` group only once
 *
 * Current edge cases and caveats:
 * - the exact-match path wins over the fallback so common Expo layouts stay
 *   deterministic even when multiple plist-like references exist
 * - the fallback intentionally accepts any `Expo.plist` match, which keeps older
 *   or less structured projects working but can select the wrong plist in more
 *   complex project layouts
 * - PBX values may be stored quoted or unquoted, so callers rely on
 *   `normalizePbxString()` before comparing paths and names
 * - if no suitable file reference exists and the project has no `Supporting`
 *   group, this throws because creating an ungrouped file reference would leave
 *   the project in an inconsistent state
 */
function getOrCreateExpoPlistFileReference(project: XcodeProject): string {
  const fileReferences = project.pbxFileReferenceSection() as Record<
    string,
    PbxFileReference | string
  >;
  const existingExpoPlistFileRefUuid =
    selectExpoPlistFileReference(fileReferences);
  if (existingExpoPlistFileRefUuid) {
    return existingExpoPlistFileRefUuid;
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
    path: EXPO_PLIST_FILE_NAME,
    sourceTree: '"<group>"',
  };
  fileReferences[`${fileRefUuid}_comment`] = EXPO_PLIST_FILE_NAME;

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
      children.push(
        createPbxCommentedReference(fileRefUuid, EXPO_PLIST_FILE_NAME)
      );
      supportingGroup.children = children;
    }
  }

  Logger.logDebug('Created PBXFileReference for Supporting/Expo.plist');

  return fileRefUuid;
}

type PbxCommentedReference = { value: string; comment: string };

type PbxReference = { value?: string; comment?: string } | string;

type PbxNativeTarget = {
  buildPhases?: PbxReference[];
};

type PbxResourcesBuildPhase = {
  isa: 'PBXResourcesBuildPhase';
  buildActionMask: number;
  files?: PbxReference[];
  runOnlyForDeploymentPostprocessing: number;
};

type PbxBuildFile = {
  isa: 'PBXBuildFile';
  fileRef: string;
};

const RESOURCES_BUILD_PHASE_COMMENT = 'Resources';
const EXPO_PLIST_RESOURCE_COMMENT = 'Expo.plist in Resources';
const PBX_BUILD_ACTION_MASK_ALL = 2147483647;
const PBX_RUN_ONLY_FOR_DEPLOYMENT_POSTPROCESSING_DISABLED = 0;
const PBX_RESOURCES_BUILD_PHASE_ISA = 'PBXResourcesBuildPhase';
const PBX_BUILD_FILE_ISA = 'PBXBuildFile';

function createPbxCommentedReference(
  value: string,
  comment: string
): PbxCommentedReference {
  return { value, comment };
}

function createResourcesBuildPhase(): PbxResourcesBuildPhase {
  return {
    isa: PBX_RESOURCES_BUILD_PHASE_ISA,
    buildActionMask: PBX_BUILD_ACTION_MASK_ALL,
    files: [],
    runOnlyForDeploymentPostprocessing:
      PBX_RUN_ONLY_FOR_DEPLOYMENT_POSTPROCESSING_DISABLED,
  };
}

function createBuildFile(fileRef: string): PbxBuildFile {
  return {
    isa: PBX_BUILD_FILE_ISA,
    fileRef,
  };
}

function getRawProjectObjects(project: XcodeProject): Record<string, any> {
  return (project as any).hash?.project?.objects ?? {};
}

function getFrameworkTargetOrThrow(
  project: XcodeProject,
  frameworkTargetUUID: string
): PbxNativeTarget {
  const nativeTargets = getRawProjectObjects(project).PBXNativeTarget as
    | Record<string, PbxNativeTarget>
    | undefined;
  const frameworkTarget = nativeTargets?.[frameworkTargetUUID];

  if (!frameworkTarget) {
    throw new SourceModificationError(
      `Framework target UUID "${frameworkTargetUUID}" not found while wiring Expo.plist as a resource`
    );
  }

  return frameworkTarget;
}

function getReferencedUuid(reference: PbxReference | undefined): string | null {
  if (!reference) {
    return null;
  }

  return typeof reference === 'string' ? reference : (reference.value ?? null);
}

function getOrCreateResourcesBuildPhaseForTarget(
  project: XcodeProject,
  frameworkTargetUUID: string,
  frameworkTarget: PbxNativeTarget
): PbxResourcesBuildPhase {
  const rawProjectObjects = getRawProjectObjects(project);
  const resourceBuildPhases = (rawProjectObjects.PBXResourcesBuildPhase ??
    {}) as Record<string, PbxResourcesBuildPhase | string>;

  const resourcesBuildPhaseUuid = (frameworkTarget.buildPhases ?? [])
    .map((phase) => getReferencedUuid(phase))
    .find((phaseUuid): phaseUuid is string => {
      return !!phaseUuid && !!resourceBuildPhases[phaseUuid];
    });

  if (resourcesBuildPhaseUuid) {
    return resourceBuildPhases[
      resourcesBuildPhaseUuid
    ] as PbxResourcesBuildPhase;
  }

  const createdResourcesBuildPhaseUuid = (project as any).generateUuid();
  resourceBuildPhases[createdResourcesBuildPhaseUuid] =
    createResourcesBuildPhase();
  resourceBuildPhases[`${createdResourcesBuildPhaseUuid}_comment`] =
    RESOURCES_BUILD_PHASE_COMMENT;

  const targetBuildPhases = Array.isArray(frameworkTarget.buildPhases)
    ? frameworkTarget.buildPhases
    : [];
  targetBuildPhases.push(
    createPbxCommentedReference(
      createdResourcesBuildPhaseUuid,
      RESOURCES_BUILD_PHASE_COMMENT
    )
  );
  frameworkTarget.buildPhases = targetBuildPhases;

  Logger.logDebug(
    `Created missing PBXResourcesBuildPhase for framework target "${frameworkTargetUUID}"`
  );

  return resourceBuildPhases[
    createdResourcesBuildPhaseUuid
  ] as PbxResourcesBuildPhase;
}

function hasBuildFileForFileRef(
  project: XcodeProject,
  resourcesBuildPhase: PbxResourcesBuildPhase,
  fileRefUuid: string
): boolean {
  const buildFileSection = project.pbxBuildFileSection() as Record<
    string,
    PbxBuildFile
  >;
  const files = Array.isArray(resourcesBuildPhase.files)
    ? resourcesBuildPhase.files
    : [];

  return files.some((phaseFile) => {
    const buildFileUuid = getReferencedUuid(phaseFile);
    if (!buildFileUuid) {
      return false;
    }

    return buildFileSection[buildFileUuid]?.fileRef === fileRefUuid;
  });
}

function addBuildFileToResourcesPhase(
  project: XcodeProject,
  resourcesBuildPhase: PbxResourcesBuildPhase,
  fileRefUuid: string,
  comment: string
): void {
  const buildFileSection = project.pbxBuildFileSection() as Record<
    string,
    PbxBuildFile | string
  >;
  const buildFileUuid = (project as any).generateUuid();

  buildFileSection[buildFileUuid] = createBuildFile(fileRefUuid);
  buildFileSection[`${buildFileUuid}_comment`] = comment;

  const files = Array.isArray(resourcesBuildPhase.files)
    ? resourcesBuildPhase.files
    : [];
  files.push(createPbxCommentedReference(buildFileUuid, comment));
  resourcesBuildPhase.files = files;
}

/**
 * Ensures the framework target contains the app-level `Supporting/Expo.plist`
 * in a `PBXResourcesBuildPhase`. This is idempotent and safe to call repeatedly.
 *
 * Current responsibilities:
 * - resolve the target from `frameworkTargetUUID`
 * - locate a resources build phase already attached to that target
 * - create and attach a new `PBXResourcesBuildPhase` when none can be resolved
 * - resolve or create the underlying `Expo.plist` file reference
 * - detect an existing `PBXBuildFile` for that file reference and avoid
 *   inserting duplicates
 * - create a `PBXBuildFile` entry and attach it to the resources phase when needed
 *
 * Current edge cases and caveats:
 * - if the target UUID cannot be resolved, this throws immediately because the
 *   helper only repairs existing framework targets; it does not create them
 * - the resources-phase lookup only checks whether a target build phase points
 *   at an object present in `PBXResourcesBuildPhase`; if a reference is missing
 *   or corrupt, the helper treats that the same as "no resources phase" and
 *   creates a fresh one
 * - malformed `buildPhases` or `files` arrays are normalized to empty arrays so
 *   the helper can still repair older or partially edited projects
 * - idempotency is based on the resolved `fileRef`, not on display comments, so
 *   repeated plugin runs do not add duplicate `Expo.plist` resource entries
 */
export function ensureFrameworkHasExpoPlistResource(
  project: XcodeProject,
  frameworkTargetUUID: string
): void {
  const frameworkTarget = getFrameworkTargetOrThrow(
    project,
    frameworkTargetUUID
  );
  const resourcesBuildPhase = getOrCreateResourcesBuildPhaseForTarget(
    project,
    frameworkTargetUUID,
    frameworkTarget
  );

  const expoPlistFileRefUuid = getOrCreateExpoPlistFileReference(project);
  if (
    hasBuildFileForFileRef(project, resourcesBuildPhase, expoPlistFileRefUuid)
  ) {
    Logger.logDebug(
      'Framework resources already include Supporting/Expo.plist'
    );
    return;
  }

  addBuildFileToResourcesPhase(
    project,
    resourcesBuildPhase,
    expoPlistFileRefUuid,
    EXPO_PLIST_RESOURCE_COMMENT
  );

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
        target.buildPhases.push(
          createPbxCommentedReference(existingPhaseUuid, buildPhaseName)
        );

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
