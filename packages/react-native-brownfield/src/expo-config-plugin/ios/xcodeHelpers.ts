import path from 'node:path';

import { type ModProps, type XcodeProject } from '@expo/config-plugins';

import { Logger } from '../logging';
import type { ResolvedBrownfieldPluginIosConfig } from '../types';
import { SourceModificationError } from '../errors/SourceModificationError';
import { getFrameworkSourceFiles } from './withIosFrameworkFiles';

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

export type PbxReferenceLike = { value?: string; comment?: string } | string;

export type PbxNativeTarget = {
  buildPhases?: PbxReferenceLike[];
  name?: string;
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
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,

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
