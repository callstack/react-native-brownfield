import {
  ensureFrameworkHasExpoPlistResource,
  selectExpoPlistFileReference,
} from '../xcodeHelpers';

describe('selectExpoPlistFileReference', () => {
  it('selects the exact Supporting/Expo.plist reference when present', () => {
    expect(
      selectExpoPlistFileReference({
        FALLBACK_FILE_REF: {
          path: './Expo.plist',
        },
        FALLBACK_FILE_REF_comment: 'Expo.plist',
        EXACT_FILE_REF: {
          path: 'App/Supporting/Expo.plist',
        },
        EXACT_FILE_REF_comment: 'Expo.plist',
      })
    ).toBe('EXACT_FILE_REF');
  });

  it('selects Expo.plist from the Supporting group when only the group carries the path', () => {
    expect(
      selectExpoPlistFileReference(
        {
          FALLBACK_FILE_REF: {
            path: './Expo.plist',
          },
          FALLBACK_FILE_REF_comment: 'Expo.plist',
          GROUP_BASED_PRIMARY_FILE_REF: {
            path: 'Expo.plist',
          },
          GROUP_BASED_PRIMARY_FILE_REF_comment: 'Expo.plist',
        },
        {
          OTHER_GROUP: {
            name: 'Config',
            children: [
              createCommentedReference('FALLBACK_FILE_REF', 'Expo.plist'),
            ],
          },
          OTHER_GROUP_comment: 'Config',
          SUPPORTING_GROUP: {
            name: 'Supporting',
            path: 'App/Supporting',
            children: [
              createCommentedReference(
                'GROUP_BASED_PRIMARY_FILE_REF',
                'Expo.plist'
              ),
            ],
          },
          SUPPORTING_GROUP_comment: 'Supporting',
        }
      )
    ).toBe('GROUP_BASED_PRIMARY_FILE_REF');
  });

  it('returns null for a loose Expo.plist path match outside Supporting', () => {
    expect(
      selectExpoPlistFileReference({
        FIRST_FALLBACK_FILE_REF: {
          path: './Expo.plist',
        },
        FIRST_FALLBACK_FILE_REF_comment: 'Expo.plist',
        SECOND_FALLBACK_FILE_REF: {
          path: 'Expo.plist',
        },
        SECOND_FALLBACK_FILE_REF_comment: 'Expo.plist',
      })
    ).toBeNull();
  });

  it('returns null for a loose Expo.plist name match outside Supporting', () => {
    expect(
      selectExpoPlistFileReference({
        NAME_ONLY_FILE_REF: {
          name: 'Expo.plist',
          path: 'Config/App.plist',
        },
        NAME_ONLY_FILE_REF_comment: 'Expo.plist',
      })
    ).toBeNull();
  });

  it('returns null when no Expo.plist reference can be reused', () => {
    expect(
      selectExpoPlistFileReference({
        OTHER_FILE_REF: {
          path: 'Supporting/Info.plist',
        },
        OTHER_FILE_REF_comment: 'Info.plist',
      })
    ).toBeNull();
  });
});

describe('ensureFrameworkHasExpoPlistResource', () => {
  it('does not add duplicate Expo.plist resources when run repeatedly', () => {
    const frameworkTargetUuid = 'FRAMEWORK_TARGET';
    const resourcesBuildPhaseUuid = 'RESOURCES_BUILD_PHASE';
    const expoPlistFileRefUuid = 'EXPO_PLIST_FILE_REF';
    const expoPlistBuildFileUuid = 'EXPO_PLIST_BUILD_FILE';
    const resourcesBuildPhase = createResourcesBuildPhase([
      createCommentedReference(
        expoPlistBuildFileUuid,
        'Expo.plist in Resources'
      ),
    ]);
    const buildFiles = {
      [expoPlistBuildFileUuid]: {
        isa: 'PBXBuildFile',
        fileRef: expoPlistFileRefUuid,
      },
      [`${expoPlistBuildFileUuid}_comment`]: 'Expo.plist in Resources',
    };
    const project = createMockXcodeProject({
      buildFiles,
      fileReferences: {
        [expoPlistFileRefUuid]: {
          path: 'App/Supporting/Expo.plist',
        },
        [`${expoPlistFileRefUuid}_comment`]: 'Expo.plist',
      },
      groups: {
        SUPPORTING_GROUP: {
          name: 'Supporting',
          children: [
            createCommentedReference(expoPlistFileRefUuid, 'Expo.plist'),
          ],
        },
        SUPPORTING_GROUP_comment: 'Supporting',
      },
      nativeTargets: {
        [frameworkTargetUuid]: {
          buildPhases: [
            createCommentedReference(resourcesBuildPhaseUuid, 'Resources'),
          ],
        },
      },
      resourcesBuildPhases: {
        [resourcesBuildPhaseUuid]: resourcesBuildPhase,
        [`${resourcesBuildPhaseUuid}_comment`]: 'Resources',
      },
    });

    ensureFrameworkHasExpoPlistResource(project, frameworkTargetUuid);
    ensureFrameworkHasExpoPlistResource(project, frameworkTargetUuid);

    expect(getNonCommentEntries(buildFiles)).toHaveLength(1);
    expect(resourcesBuildPhase.files).toEqual([
      createCommentedReference(
        expoPlistBuildFileUuid,
        'Expo.plist in Resources'
      ),
    ]);
    expect(
      getNonCommentEntries(project.hash.project.objects.PBXResourcesBuildPhase)
    ).toHaveLength(1);
  });

  it('creates and attaches a resources phase when the framework target has none', () => {
    const frameworkTargetUuid = 'FRAMEWORK_TARGET';
    const resourcesBuildPhaseUuid = 'CREATED_RESOURCES_BUILD_PHASE';
    const expoPlistBuildFileUuid = 'CREATED_EXPO_PLIST_BUILD_FILE';
    const expoPlistFileRefUuid = 'EXISTING_EXPO_PLIST_FILE_REF';
    const project = createMockXcodeProject({
      fileReferences: {
        [expoPlistFileRefUuid]: {
          path: 'App/Supporting/Expo.plist',
        },
        [`${expoPlistFileRefUuid}_comment`]: 'Expo.plist',
      },
      groups: {
        SUPPORTING_GROUP: {
          name: 'Supporting',
          children: [
            createCommentedReference(expoPlistFileRefUuid, 'Expo.plist'),
          ],
        },
        SUPPORTING_GROUP_comment: 'Supporting',
      },
      nativeTargets: {
        [frameworkTargetUuid]: {
          buildPhases: [],
        },
      },
      resourcesBuildPhases: {},
      uuids: [resourcesBuildPhaseUuid, expoPlistBuildFileUuid],
    });

    ensureFrameworkHasExpoPlistResource(project, frameworkTargetUuid);

    expect(
      project.hash.project.objects.PBXNativeTarget[frameworkTargetUuid]
    ).toEqual({
      buildPhases: [
        createCommentedReference(
          resourcesBuildPhaseUuid,
          'Resources test comment'
        ),
      ],
    });
    expect(project.hash.project.objects.PBXResourcesBuildPhase).toEqual({
      [resourcesBuildPhaseUuid]: createResourcesBuildPhase([
        createCommentedReference(
          expoPlistBuildFileUuid,
          'Expo.plist in Resources'
        ),
      ]),
      [`${resourcesBuildPhaseUuid}_comment`]: 'Resources test comment',
    });
    expect(project.pbxBuildFileSection()).toEqual({
      [expoPlistBuildFileUuid]: {
        isa: 'PBXBuildFile',
        fileRef: expoPlistFileRefUuid,
      },
      [`${expoPlistBuildFileUuid}_comment`]: 'Expo.plist in Resources',
    });
  });

  it('throws when Supporting/Expo.plist is missing even if the Supporting group exists', () => {
    const frameworkTargetUuid = 'FRAMEWORK_TARGET';
    const resourcesBuildPhaseUuid = 'RESOURCES_BUILD_PHASE';
    const project = createMockXcodeProject({
      fileReferences: {},
      groups: {
        SUPPORTING_GROUP: {
          name: 'Supporting',
          children: [],
          path: 'App/Supporting',
        },
        SUPPORTING_GROUP_comment: 'Supporting',
      },
      nativeTargets: {
        [frameworkTargetUuid]: {
          buildPhases: [
            createCommentedReference(resourcesBuildPhaseUuid, 'Resources'),
          ],
        },
      },
      resourcesBuildPhases: {
        [resourcesBuildPhaseUuid]: createResourcesBuildPhase([]),
        [`${resourcesBuildPhaseUuid}_comment`]: 'Resources',
      },
    });

    expect(() =>
      ensureFrameworkHasExpoPlistResource(project, frameworkTargetUuid)
    ).toThrow(
      'Could not find the "Supporting/Expo.plist" PBXFileReference needed for Expo.plist resource wiring'
    );
    expect(project.pbxFileReferenceSection()).toEqual({});
    expect(
      project.hash.project.objects.PBXGroup.SUPPORTING_GROUP.children
    ).toEqual([]);
    expect(project.pbxBuildFileSection()).toEqual({});
  });

  it('throws the same error when Supporting/Expo.plist is missing and there is no Supporting group', () => {
    const frameworkTargetUuid = 'FRAMEWORK_TARGET';
    const resourcesBuildPhaseUuid = 'RESOURCES_BUILD_PHASE';
    const project = createMockXcodeProject({
      fileReferences: {},
      groups: {},
      nativeTargets: {
        [frameworkTargetUuid]: {
          buildPhases: [
            createCommentedReference(resourcesBuildPhaseUuid, 'Resources'),
          ],
        },
      },
      resourcesBuildPhases: {
        [resourcesBuildPhaseUuid]: createResourcesBuildPhase([]),
        [`${resourcesBuildPhaseUuid}_comment`]: 'Resources',
      },
    });

    expect(() =>
      ensureFrameworkHasExpoPlistResource(project, frameworkTargetUuid)
    ).toThrow(
      'Could not find the "Supporting/Expo.plist" PBXFileReference needed for Expo.plist resource wiring'
    );
    expect(project.pbxBuildFileSection()).toEqual({});
  });

  it('uses the Supporting-group Expo.plist reference when multiple plist-like references exist', () => {
    const frameworkTargetUuid = 'FRAMEWORK_TARGET';
    const resourcesBuildPhaseUuid = 'RESOURCES_BUILD_PHASE';
    const fallbackExpoPlistFileRefUuid = 'FALLBACK_EXPO_PLIST_FILE_REF';
    const exactExpoPlistFileRefUuid = 'EXACT_EXPO_PLIST_FILE_REF';
    const expoPlistBuildFileUuid = 'CREATED_EXPO_PLIST_BUILD_FILE';
    const resourcesBuildPhase = createResourcesBuildPhase([]);
    const project = createMockXcodeProject({
      fileReferences: {
        [fallbackExpoPlistFileRefUuid]: {
          path: './Expo.plist',
        },
        [`${fallbackExpoPlistFileRefUuid}_comment`]: 'Expo.plist',
        [exactExpoPlistFileRefUuid]: {
          path: 'Expo.plist',
        },
        [`${exactExpoPlistFileRefUuid}_comment`]: 'Expo.plist',
      },
      groups: {
        SUPPORTING_GROUP: {
          name: 'Supporting',
          children: [
            createCommentedReference(exactExpoPlistFileRefUuid, 'Expo.plist'),
          ],
          path: 'App/Supporting',
        },
        SUPPORTING_GROUP_comment: 'Supporting',
        OTHER_GROUP: {
          name: 'Config',
          children: [
            createCommentedReference(
              fallbackExpoPlistFileRefUuid,
              'Expo.plist'
            ),
          ],
        },
        OTHER_GROUP_comment: 'Config',
      },
      nativeTargets: {
        [frameworkTargetUuid]: {
          buildPhases: [
            createCommentedReference(resourcesBuildPhaseUuid, 'Resources'),
          ],
        },
      },
      resourcesBuildPhases: {
        [resourcesBuildPhaseUuid]: resourcesBuildPhase,
        [`${resourcesBuildPhaseUuid}_comment`]: 'Resources',
      },
      uuids: [expoPlistBuildFileUuid],
    });

    ensureFrameworkHasExpoPlistResource(project, frameworkTargetUuid);

    expect(project.pbxBuildFileSection()).toEqual({
      [expoPlistBuildFileUuid]: {
        isa: 'PBXBuildFile',
        fileRef: exactExpoPlistFileRefUuid,
      },
      [`${expoPlistBuildFileUuid}_comment`]: 'Expo.plist in Resources',
    });
    expect(resourcesBuildPhase.files).toEqual([
      createCommentedReference(
        expoPlistBuildFileUuid,
        'Expo.plist in Resources'
      ),
    ]);
  });
});

type MockXcodeProject = {
  hash: {
    project: {
      objects: {
        PBXGroup: Record<string, any>;
        PBXNativeTarget: Record<string, any>;
        PBXResourcesBuildPhase: Record<string, any>;
      };
    };
  };
  pbxBuildFileSection: () => Record<string, any>;
  pbxFileReferenceSection: () => Record<string, any>;
  generateUuid: () => string;
};

function createMockXcodeProject({
  buildFiles = {},
  fileReferences = {},
  groups,
  nativeTargets,
  resourcesBuildPhases,
  uuids = [],
}: {
  buildFiles?: Record<string, any>;
  fileReferences?: Record<string, any>;
  groups: Record<string, any>;
  nativeTargets: Record<string, any>;
  resourcesBuildPhases: Record<string, any>;
  uuids?: string[];
}): MockXcodeProject {
  return {
    hash: {
      project: {
        objects: {
          PBXGroup: groups,
          PBXNativeTarget: nativeTargets,
          PBXResourcesBuildPhase: resourcesBuildPhases,
        },
      },
    },
    pbxBuildFileSection: () => buildFiles,
    pbxFileReferenceSection: () => fileReferences,
    generateUuid: () => {
      const uuid = uuids.shift();
      if (!uuid) {
        throw new Error('generateUuid was called unexpectedly');
      }

      return uuid;
    },
  };
}

function createResourcesBuildPhase(
  files: Array<{ value: string; comment: string }>
) {
  return {
    isa: 'PBXResourcesBuildPhase',
    buildActionMask: 2147483647,
    files,
    runOnlyForDeploymentPostprocessing: 0,
  };
}

function createCommentedReference(value: string, comment: string) {
  return { value, comment };
}

function getNonCommentEntries(section: Record<string, unknown>) {
  return Object.entries(section).filter(([key]) => !key.endsWith('_comment'));
}
