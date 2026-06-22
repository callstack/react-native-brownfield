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

  const existingFrameworkTargetUuid = findFrameworkTargetUuidByName(
    project,
    frameworkName
  );
  if (existingFrameworkTargetUuid) {
    dedupeFrameworkTargets(project, frameworkName, existingFrameworkTargetUuid);
    Logger.logDebug(
      `Framework target "${frameworkName}" already exists, skipping creation`
    );

    return {
      frameworkTargetUUID: existingFrameworkTargetUuid,
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

  dedupeFrameworkTargets(project, frameworkName, frameworkTarget.uuid);
  Logger.logInfo(`Successfully added framework target: ${frameworkName}`);

  return {
    frameworkTargetUUID: frameworkTarget.uuid,
    targetAlreadyExists: false,
  };
}

function findFrameworkTargetUuidByName(
  project: XcodeProject,
  frameworkName: string
): string | null {
  const [frameworkTargetUuid] = findFrameworkTargetUuidsByName(
    project,
    frameworkName
  );

  return frameworkTargetUuid ?? null;
}

function findFrameworkTargetUuidsByName(
  project: XcodeProject,
  frameworkName: string
): string[] {
  const nativeTargets = project.pbxNativeTargetSection() as Record<
    string,
    {
      isa?: string;
      name?: string;
      productType?: string;
    }
  >;

  const normalizedFrameworkName = frameworkName.trim();
  const matchingUuids: string[] = [];

  for (const [uuid, target] of Object.entries(nativeTargets)) {
    if (uuid.endsWith('_comment')) {
      continue;
    }

    if (target?.isa !== 'PBXNativeTarget') {
      continue;
    }

    const targetName = IOSConfig.XcodeUtils.unquote(target.name ?? '').trim();
    if (targetName !== normalizedFrameworkName) {
      continue;
    }

    const productType = IOSConfig.XcodeUtils.unquote(target.productType ?? '');
    if (productType !== 'com.apple.product-type.framework') {
      continue;
    }

    matchingUuids.push(uuid);
  }

  return matchingUuids;
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

export type PbxReferenceLike = { value?: string; comment?: string } | string;

export type PbxNativeTarget = {
  buildPhases?: PbxReferenceLike[];
  buildConfigurationList?: string;
  name?: string;
  productReference?: string;
};

export type PbxResourcesBuildPhase = {
  isa: 'PBXResourcesBuildPhase';
  buildActionMask: number;
  files?: PbxReferenceLike[];
  runOnlyForDeploymentPostprocessing: number;
};

export type PbxBuildFile = {
  isa: 'PBXBuildFile';
  fileRef: string;
};

export type PbxCommentedReference = { value: string; comment: string };

const PBX_BUILD_ACTION_MASK_ALL = 2147483647;
const PBX_RUN_ONLY_FOR_DEPLOYMENT_POSTPROCESSING_DISABLED = 0;
const PBX_RESOURCES_BUILD_PHASE_ISA = 'PBXResourcesBuildPhase';
const PBX_BUILD_FILE_ISA = 'PBXBuildFile';

export function createPbxCommentedReference(
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

function getReferencedUuid(
  reference: PbxReferenceLike | undefined
): string | null {
  if (!reference) {
    return null;
  }

  return typeof reference === 'string' ? reference : (reference.value ?? null);
}

const PBX_BUILD_PHASE_SECTIONS = [
  'PBXCopyFilesBuildPhase',
  'PBXFrameworksBuildPhase',
  'PBXHeadersBuildPhase',
  'PBXResourcesBuildPhase',
  'PBXShellScriptBuildPhase',
  'PBXSourcesBuildPhase',
] as const;

function removeBuildFileIfUnreferenced(
  rawProjectObjects: Record<string, any>,
  buildFileUuid: string
): void {
  for (const sectionName of PBX_BUILD_PHASE_SECTIONS) {
    const section = rawProjectObjects[sectionName] as
      | Record<string, { files?: PbxReferenceLike[] }>
      | undefined;

    if (!section) {
      continue;
    }

    for (const [uuid, phase] of Object.entries(section)) {
      if (uuid.endsWith('_comment')) {
        continue;
      }

      const files = Array.isArray(phase?.files) ? phase.files : [];
      if (files.some((file) => getReferencedUuid(file) === buildFileUuid)) {
        return;
      }
    }
  }

  const buildFiles = rawProjectObjects.PBXBuildFile as
    | Record<string, unknown>
    | undefined;
  if (!buildFiles) {
    return;
  }

  delete buildFiles[buildFileUuid];
  delete buildFiles[`${buildFileUuid}_comment`];
}

function removeBuildPhase(
  rawProjectObjects: Record<string, any>,
  buildPhaseUuid: string
): void {
  for (const sectionName of PBX_BUILD_PHASE_SECTIONS) {
    const section = rawProjectObjects[sectionName] as
      | Record<string, { files?: PbxReferenceLike[] }>
      | undefined;

    if (!section?.[buildPhaseUuid]) {
      continue;
    }

    const phase = section[buildPhaseUuid];
    const files = Array.isArray(phase?.files) ? phase.files : [];

    delete section[buildPhaseUuid];
    delete section[`${buildPhaseUuid}_comment`];

    for (const file of files) {
      const buildFileUuid = getReferencedUuid(file);
      if (buildFileUuid) {
        removeBuildFileIfUnreferenced(rawProjectObjects, buildFileUuid);
      }
    }

    return;
  }
}

function removeConfigurationList(
  rawProjectObjects: Record<string, any>,
  configurationListUuid: string
): void {
  const configurationLists = rawProjectObjects.XCConfigurationList as
    | Record<string, { buildConfigurations?: PbxReferenceLike[] }>
    | undefined;
  const buildConfigurations = rawProjectObjects.XCBuildConfiguration as
    | Record<string, unknown>
    | undefined;

  const configurationList = configurationLists?.[configurationListUuid];
  const configs = Array.isArray(configurationList?.buildConfigurations)
    ? configurationList.buildConfigurations
    : [];

  for (const config of configs) {
    const configUuid = getReferencedUuid(config);
    if (!configUuid || !buildConfigurations) {
      continue;
    }

    delete buildConfigurations[configUuid];
    delete buildConfigurations[`${configUuid}_comment`];
  }

  if (configurationLists) {
    delete configurationLists[configurationListUuid];
    delete configurationLists[`${configurationListUuid}_comment`];
  }
}

function removeProductReference(
  project: XcodeProject,
  rawProjectObjects: Record<string, any>,
  productReferenceUuid: string
): void {
  if (typeof project.getFirstProject !== 'function') {
    return;
  }

  const fileReferences = rawProjectObjects.PBXFileReference as
    | Record<string, unknown>
    | undefined;
  if (fileReferences) {
    delete fileReferences[productReferenceUuid];
    delete fileReferences[`${productReferenceUuid}_comment`];
  }

  const productsGroupUuid =
    project.getFirstProject().firstProject.productRefGroup;
  const groups = rawProjectObjects.PBXGroup as
    | Record<string, { children?: PbxReferenceLike[] }>
    | undefined;
  const productsGroup = groups?.[productsGroupUuid];
  if (!Array.isArray(productsGroup?.children)) {
    return;
  }

  productsGroup.children = productsGroup.children.filter(
    (child) => getReferencedUuid(child) !== productReferenceUuid
  );
}

function dedupeFrameworkTargets(
  project: XcodeProject,
  frameworkName: string,
  canonicalTargetUuid: string
): void {
  if (typeof project.getFirstProject !== 'function') {
    return;
  }

  const duplicateTargetUuids = findFrameworkTargetUuidsByName(
    project,
    frameworkName
  ).filter((uuid) => uuid !== canonicalTargetUuid);

  if (duplicateTargetUuids.length === 0) {
    return;
  }

  const rawProjectObjects = getRawProjectObjects(project);
  const nativeTargets = rawProjectObjects.PBXNativeTarget as
    | Record<string, PbxNativeTarget>
    | undefined;
  const firstProject = project.getFirstProject().firstProject;
  const projectTargets = Array.isArray(firstProject.targets)
    ? firstProject.targets
    : [];

  for (const duplicateTargetUuid of duplicateTargetUuids) {
    const duplicateTarget = nativeTargets?.[duplicateTargetUuid];
    if (!duplicateTarget) {
      continue;
    }

    for (const buildPhase of duplicateTarget.buildPhases ?? []) {
      const buildPhaseUuid = getReferencedUuid(buildPhase);
      if (buildPhaseUuid) {
        removeBuildPhase(rawProjectObjects, buildPhaseUuid);
      }
    }

    if (duplicateTarget.buildConfigurationList) {
      removeConfigurationList(
        rawProjectObjects,
        duplicateTarget.buildConfigurationList
      );
    }

    if (duplicateTarget.productReference) {
      removeProductReference(
        project,
        rawProjectObjects,
        duplicateTarget.productReference
      );
    }

    delete nativeTargets?.[duplicateTargetUuid];
    delete nativeTargets?.[`${duplicateTargetUuid}_comment`];
  }

  firstProject.targets = projectTargets.filter(
    (target: PbxReferenceLike) =>
      !duplicateTargetUuids.includes(getReferencedUuid(target) ?? '')
  );

  Logger.logDebug(
    `Removed ${duplicateTargetUuids.length} duplicate framework target(s) for "${frameworkName}"`
  );
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
      `Framework target UUID "${frameworkTargetUUID}" not found while wiring a resources build phase`
    );
  }

  return frameworkTarget;
}

function getOrCreateResourcesBuildPhaseForTarget(
  project: XcodeProject,
  frameworkTargetUUID: string,
  frameworkTarget: PbxNativeTarget,
  resourcesBuildPhaseComment: string
): PbxResourcesBuildPhase {
  const rawProjectObjects = getRawProjectObjects(project);
  const resourceBuildPhases = (rawProjectObjects.PBXResourcesBuildPhase ??
    (rawProjectObjects.PBXResourcesBuildPhase = {})) as Record<
    string,
    PbxResourcesBuildPhase | string
  >;

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
    resourcesBuildPhaseComment;

  const targetBuildPhases = Array.isArray(frameworkTarget.buildPhases)
    ? frameworkTarget.buildPhases
    : [];
  targetBuildPhases.push(
    createPbxCommentedReference(
      createdResourcesBuildPhaseUuid,
      resourcesBuildPhaseComment
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
  buildFileComment: string
): void {
  const buildFileSection = project.pbxBuildFileSection() as Record<
    string,
    PbxBuildFile | string
  >;
  const buildFileUuid = (project as any).generateUuid();

  buildFileSection[buildFileUuid] = createBuildFile(fileRefUuid);
  buildFileSection[`${buildFileUuid}_comment`] = buildFileComment;

  const files = Array.isArray(resourcesBuildPhase.files)
    ? resourcesBuildPhase.files
    : [];
  files.push(createPbxCommentedReference(buildFileUuid, buildFileComment));
  resourcesBuildPhase.files = files;
}

type ResourcesBuildPhaseOptions = {
  resourcesBuildPhaseComment: string;
  buildFileComment: string;
};

export function ensureTargetHasFileReferenceInResourcesBuildPhase(
  project: XcodeProject,
  frameworkTargetUUID: string,
  fileRefUuid: string,
  { resourcesBuildPhaseComment, buildFileComment }: ResourcesBuildPhaseOptions
): boolean {
  const frameworkTarget = getFrameworkTargetOrThrow(
    project,
    frameworkTargetUUID
  );
  const resourcesBuildPhase = getOrCreateResourcesBuildPhaseForTarget(
    project,
    frameworkTargetUUID,
    frameworkTarget,
    resourcesBuildPhaseComment
  );

  if (hasBuildFileForFileRef(project, resourcesBuildPhase, fileRefUuid)) {
    return false;
  }

  addBuildFileToResourcesPhase(
    project,
    resourcesBuildPhase,
    fileRefUuid,
    buildFileComment
  );

  return true;
}

/**
 * Returns build settings for the framework target
 * @param options The user configuration
 * @returns Build settings object
 */
export function getFrameworkBuildSettings(
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
    INSTALL_PATH: '"$(LOCAL_LIBRARY_DIR)/Frameworks"',

    // basic settings
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget ?? '15.0',

    // Ensure the BrownfieldLib (or equivalent name) is installed at the correct path
    DYLIB_INSTALL_NAME_BASE: '"@rpath"',
    LD_DYLIB_INSTALL_NAME: '"@rpath/$(EXECUTABLE_PATH)"',

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

export function rewriteBundleReactNativePhaseScriptForFrameworkTarget(
  shellScript: string
): string {
  const debugBundlingOverride = `# Brownfield framework packaging must embed JS in Debug builds.
if [[ "$CONFIGURATION" = *Debug* ]]; then
  unset SKIP_BUNDLING
  export FORCE_BUNDLING=1
  export EXTRA_PACKAGER_ARGS="$EXTRA_PACKAGER_ARGS --dev false"
fi
`;
  const debugSkipBundlingBlock =
    /if \[\[ "\$CONFIGURATION" = \*Debug\* \]\]; then\s+export SKIP_BUNDLING=1\s+fi\s*/m;
  const forceBundlingExport = /^([ \t]*)export FORCE_BUNDLING=1[ \t]*$/m;

  if (debugSkipBundlingBlock.test(shellScript)) {
    return shellScript.replace(
      debugSkipBundlingBlock,
      `${debugBundlingOverride}\n`
    );
  }

  if (shellScript.includes('export FORCE_BUNDLING=1')) {
    if (shellScript.includes('--dev false')) {
      return shellScript;
    }

    if (forceBundlingExport.test(shellScript)) {
      return shellScript.replace(
        forceBundlingExport,
        (_, indentation: string) =>
          `${indentation}export FORCE_BUNDLING=1\n${indentation}export EXTRA_PACKAGER_ARGS="$EXTRA_PACKAGER_ARGS --dev false"`
      );
    }

    return shellScript;
  }

  return `${debugBundlingOverride}\n${shellScript}`;
}

function decodePbxString(value: string | undefined): string {
  if (!value) {
    return '';
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1).replace(/\\"/g, '"');
    }
  }

  return value;
}

function encodePbxString(value: string): string {
  return JSON.stringify(value);
}

function hasBuildPhaseComment(
  phase: { comment?: string },
  expectedComment: string
): boolean {
  return (
    phase.comment === expectedComment ||
    phase.comment === `"${expectedComment}"`
  );
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
  let existingPhase: Record<string, any> | null = null;
  for (const key of Object.keys(shellScriptPhases)) {
    if (key.endsWith('_comment')) continue;
    const phase = shellScriptPhases[key];
    if (phase.name === `"${buildPhaseName}"` || phase.name === buildPhaseName) {
      existingPhaseUuid = key;
      existingPhase = phase;
      break;
    }
  }

  if (!existingPhaseUuid || !existingPhase) {
    throw new SourceModificationError(
      `Could not find "${buildPhaseName}" build phase, skipping`
    );
  }

  const nativeTargets = project.hash.project.objects.PBXNativeTarget;
  if (nativeTargets && nativeTargets[targetUuid]) {
    const target = nativeTargets[targetUuid];
    if (target.buildPhases) {
      const targetPhaseIndex = target.buildPhases.findIndex(
        (phase: { comment?: string }) =>
          hasBuildPhaseComment(phase, buildPhaseName)
      );
      const frameworkShellPath =
        decodePbxString(existingPhase.shellPath) || '/bin/sh';
      const frameworkShellScript =
        rewriteBundleReactNativePhaseScriptForFrameworkTarget(
          decodePbxString(existingPhase.shellScript)
        );

      if (targetPhaseIndex !== -1) {
        const currentPhaseUuid = target.buildPhases[targetPhaseIndex].value;
        const currentPhase = shellScriptPhases[currentPhaseUuid];

        if (currentPhase && currentPhaseUuid !== existingPhaseUuid) {
          currentPhase.inputPaths = existingPhase.inputPaths ?? [];
          currentPhase.outputPaths = existingPhase.outputPaths ?? [];
          currentPhase.shellPath = encodePbxString(frameworkShellPath);
          currentPhase.shellScript = encodePbxString(frameworkShellScript);

          if (existingPhase.showEnvVarsInLog !== undefined) {
            currentPhase.showEnvVarsInLog = existingPhase.showEnvVarsInLog;
          }

          Logger.logDebug(
            `Updated framework-specific "${buildPhaseName}" build phase on target ${target.name}`
          );
          return;
        }

        if (currentPhaseUuid === existingPhaseUuid) {
          target.buildPhases.splice(targetPhaseIndex, 1);
        } else {
          return;
        }
      }

      const addedPhase = project.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        buildPhaseName,
        targetUuid,
        {
          inputPaths: existingPhase.inputPaths ?? [],
          outputPaths: existingPhase.outputPaths ?? [],
          shellPath: frameworkShellPath,
          shellScript: frameworkShellScript,
        }
      );

      if (existingPhase.showEnvVarsInLog !== undefined) {
        addedPhase.buildPhase.showEnvVarsInLog = existingPhase.showEnvVarsInLog;
      }

      Logger.logDebug(
        `Added framework-specific "${buildPhaseName}" build phase to target ${target.name}`
      );
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

function normalizeXcodeBuildSettingValue(
  value: string | number | boolean | null | undefined
): string | null {
  if (value == null) {
    return null;
  }

  const normalized = IOSConfig.XcodeUtils.unquote(String(value)).trim();
  return normalized.length > 0 ? normalized : null;
}

export function getAppTargetDeploymentTarget(
  project: Pick<XcodeProject, 'getBuildProperty'>,
  appTargetName: string | null
): string | null {
  if (!appTargetName) {
    return null;
  }

  return (
    normalizeXcodeBuildSettingValue(
      project.getBuildProperty(
        'IPHONEOS_DEPLOYMENT_TARGET',
        'Release',
        appTargetName
      )
    ) ??
    normalizeXcodeBuildSettingValue(
      project.getBuildProperty(
        'IPHONEOS_DEPLOYMENT_TARGET',
        'Debug',
        appTargetName
      )
    )
  );
}

export function resolveFrameworkDeploymentTarget(
  project: XcodeProject,
  modRequest: ModProps<XcodeProject>,
  {
    fallbackDeploymentTarget,
  }: {
    fallbackDeploymentTarget?: string;
  }
): string {
  if (fallbackDeploymentTarget != null) {
    return fallbackDeploymentTarget;
  }

  const appTargetName = resolveAppTargetName(project, modRequest);
  const appTargetDeploymentTarget = getAppTargetDeploymentTarget(
    project,
    appTargetName
  );

  return appTargetDeploymentTarget ?? '15.0';
}

/**
 * Adds the "Patch ExpoModulesProvider" shell script phase to the framework target.
 * Safe to call on every prebuild: skips creation when the phase is already present.
 */
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

  const existingBuildPhases =
    project.pbxNativeTargetSection()[frameworkTargetUUID]?.buildPhases ?? [];
  if (
    existingBuildPhases.some((phase: { comment?: string }) =>
      hasBuildPhaseComment(phase, 'Patch ExpoModulesProvider')
    )
  ) {
    return;
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
