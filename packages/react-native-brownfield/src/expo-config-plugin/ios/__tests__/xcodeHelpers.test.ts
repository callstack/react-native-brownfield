import { describe, expect, it, vi } from 'vitest';

vi.mock('../withIosFrameworkFiles', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../withIosFrameworkFiles')>();
  return {
    ...actual,
    getFrameworkSourceFiles: vi.fn(actual.getFrameworkSourceFiles),
  };
});

import {
  addFrameworkTarget,
  addSourceFilesBuildPhase,
  getAppTargetDeploymentTarget,
  getFrameworkBuildSettings,
  rewriteBundleReactNativePhaseScriptForFrameworkTarget,
} from '../xcodeHelpers';
import type { ResolvedBrownfieldPluginIosConfig } from '../../types';

const baseOptions: ResolvedBrownfieldPluginIosConfig = {
  frameworkName: 'BrownfieldLib',
  bundleIdentifier: 'com.example.brownfield',
  deploymentTarget: '15.0',
  frameworkVersion: '1',
  buildSettings: {},
};

describe('getFrameworkBuildSettings', () => {
  it('uses rpath-based install settings for generated framework targets', () => {
    const settings = getFrameworkBuildSettings(
      { configuration: 'Debug' },
      baseOptions
    );

    expect(settings.DYLIB_INSTALL_NAME_BASE).toBe('"@rpath"');
    expect(settings.INSTALL_PATH).toBe('"$(LOCAL_LIBRARY_DIR)/Frameworks"');
    expect(settings.SKIP_INSTALL).toBe('NO');
  });

  it('preserves custom build settings while keeping required framework settings', () => {
    const settings = getFrameworkBuildSettings(
      { configuration: 'Release' },
      {
        ...baseOptions,
        buildSettings: {
          SWIFT_VERSION: '5.10',
          MARKETING_VERSION: '9.9.9',
        },
      }
    );

    expect(settings.DYLIB_INSTALL_NAME_BASE).toBe('"@rpath"');
    expect(settings.INSTALL_PATH).toBe('"$(LOCAL_LIBRARY_DIR)/Frameworks"');
    expect(settings.SWIFT_VERSION).toBe('5.10');
    expect(settings.MARKETING_VERSION).toBe('9.9.9');
  });
});

describe('addFrameworkTarget', () => {
  function createProjectStub() {
    const addedGroups: { filePaths: string[] }[] = [];
    return {
      addedGroups,
      pbxTargetByName: () => undefined,
      addTarget: () => ({
        uuid: 'FRAMEWORK_UUID',
        pbxNativeTarget: { buildConfigurationList: 'CONFIG_LIST' },
      }),
      pbxXCConfigurationList: () => ({
        CONFIG_LIST: {
          buildConfigurations: [
            { comment: 'Debug', value: 'DEBUG_CONFIG' },
            { comment: 'Release', value: 'RELEASE_CONFIG' },
          ],
        },
      }),
      pbxXCBuildConfigurationSection: () => ({
        DEBUG_CONFIG: { buildSettings: {} },
        RELEASE_CONFIG: { buildSettings: {} },
      }),
      updateBuildProperty: () => undefined,
      addPbxGroup: (filePaths: string[]) => {
        addedGroups.push({ filePaths });
        return { uuid: 'GROUP_UUID' };
      },
      getFirstProject: () => ({ firstProject: { mainGroup: 'MAIN_GROUP' } }),
      addToPbxGroup: () => undefined,
    } as any;
  }

  const modRequest = {
    platformProjectRoot: '/app/ios',
    projectRoot: '/app',
  } as any;

  it('forwards the useExpoHost option to the framework source file group', async () => {
    const { getFrameworkSourceFiles } =
      await import('../withIosFrameworkFiles');
    const project = createProjectStub();

    addFrameworkTarget(project, modRequest, baseOptions, {
      useExpoHost: false,
    });

    expect(getFrameworkSourceFiles).toHaveBeenCalledWith(baseOptions, {
      useExpoHost: false,
    });
    expect(project.addedGroups[0]?.filePaths).toEqual([
      'BrownfieldLib.swift',
      'Info.plist',
    ]);
  });

  it('detects previously added targets stored with quoted names', () => {
    // xcode@3.x addTarget stores names/comments quoted and the parser keeps
    // the quotes on re-parse, so pbxTargetByName misses them. Without the
    // quoted-name fallback this run would create a duplicate target.
    const project = {
      pbxTargetByName: () => undefined,
      addTarget: vi.fn(),
      hash: {
        project: {
          objects: {
            PBXNativeTarget: {
              FRAMEWORK_UUID: {
                isa: 'PBXNativeTarget',
                name: '"BrownfieldLib"',
                productReference: 'PRODUCT_REF',
              },
            },
          },
        },
      },
      pbxNativeTargetSection: () => ({
        FRAMEWORK_UUID: {
          isa: 'PBXNativeTarget',
          name: '"BrownfieldLib"',
          productReference: 'PRODUCT_REF',
        },
      }),
    } as any;

    const result = addFrameworkTarget(project, modRequest, baseOptions, {
      useExpoHost: false,
    });

    expect(project.addTarget).not.toHaveBeenCalled();
    expect(result).toEqual({
      frameworkTargetUUID: 'FRAMEWORK_UUID',
      targetAlreadyExists: true,
    });
  });
});

describe('addSourceFilesBuildPhase', () => {
  function createProjectStub() {
    const calls: unknown[][] = [];
    return {
      calls,
      addBuildPhase(...args: unknown[]) {
        calls.push(args);
      },
    } as any;
  }

  it('passes the useExpoHost option through to the rendered source files', async () => {
    const { getFrameworkSourceFiles } =
      await import('../withIosFrameworkFiles');
    const project = createProjectStub();

    addSourceFilesBuildPhase(project, 'FRAMEWORK_UUID', baseOptions, {
      useExpoHost: false,
    });

    expect(getFrameworkSourceFiles).toHaveBeenCalledWith(baseOptions, {
      useExpoHost: false,
    });
    // Only the Swift sources are added; Info.plist is filtered out.
    expect(project.calls).toHaveLength(1);
    expect(project.calls[0][0]).toEqual(['BrownfieldLib.swift']);
  });

  it('skips adding a duplicate sources phase when the target already has one', () => {
    const project = {
      calls: [] as unknown[][],
      hash: {
        project: {
          objects: {
            PBXNativeTarget: {
              FRAMEWORK_UUID: {
                isa: 'PBXNativeTarget',
                name: '"BrownfieldLib"',
                buildPhases: [
                  {
                    value: 'SOURCES_PHASE_UUID',
                    comment: 'BrownfieldLib',
                  },
                ],
              },
            },
          },
        },
      },
      addBuildPhase(...args: unknown[]) {
        (this as any).calls.push(args);
      },
    } as any;

    addSourceFilesBuildPhase(project, 'FRAMEWORK_UUID', baseOptions, {
      useExpoHost: false,
    });

    expect(project.calls).toHaveLength(0);
  });

  it('renders Expo-hosted source files when no brownfield options are given', async () => {
    const { getFrameworkSourceFiles } =
      await import('../withIosFrameworkFiles');
    const project = createProjectStub();

    addSourceFilesBuildPhase(project, 'FRAMEWORK_UUID', baseOptions);

    // The undefined options defer to getFrameworkSourceFiles' Expo default.
    expect(getFrameworkSourceFiles).toHaveBeenCalledWith(
      baseOptions,
      undefined
    );
    expect(project.calls).toHaveLength(1);
    expect(project.calls[0][0]).toEqual(['BrownfieldLib.swift']);
  });
});

describe('getAppTargetDeploymentTarget', () => {
  it('prefers the release deployment target and strips quotes', () => {
    const project = {
      getBuildProperty: (_prop: string, build?: string) =>
        build === 'Release' ? '"16.4"' : '"16.0"',
    } as any;

    expect(getAppTargetDeploymentTarget(project, 'ExpoApp58')).toBe('16.4');
  });
});

describe('rewriteBundleReactNativePhaseScriptForFrameworkTarget', () => {
  it('replaces Expo debug skip-bundling logic with a force-bundling override', () => {
    const script = `if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi

if [[ -z "$BUNDLE_COMMAND" ]]; then
  export BUNDLE_COMMAND="export:embed"
fi

\`"$NODE_BINARY" --print "require.resolve('react-native/package.json')"\`/scripts/react-native-xcode.sh
`;

    const rewritten =
      rewriteBundleReactNativePhaseScriptForFrameworkTarget(script);

    expect(rewritten).toContain('unset SKIP_BUNDLING');
    expect(rewritten).toContain('export FORCE_BUNDLING=1');
    expect(rewritten).toContain(
      'export EXTRA_PACKAGER_ARGS="$EXTRA_PACKAGER_ARGS --dev false"'
    );
    expect(rewritten).not.toContain('export SKIP_BUNDLING=1');
    expect(rewritten).toContain('export BUNDLE_COMMAND="export:embed"');
    expect(rewritten).toContain('react-native-xcode.sh');
  });

  it('prepends the debug override when the source script has no Expo skip block', () => {
    const script = `export ENTRY_FILE="index.js"
\`"$NODE_BINARY" --print "require.resolve('react-native/package.json')"\`/scripts/react-native-xcode.sh
`;

    const rewritten =
      rewriteBundleReactNativePhaseScriptForFrameworkTarget(script);

    expect(rewritten).toMatch(
      /^# Brownfield framework packaging must embed JS in Debug builds\.\nif \[\[ "\$CONFIGURATION" = \*Debug\* \]\]; then\n {2}unset SKIP_BUNDLING\n {2}export FORCE_BUNDLING=1\n {2}export EXTRA_PACKAGER_ARGS="\$EXTRA_PACKAGER_ARGS --dev false"\nfi\n\nexport ENTRY_FILE="index\.js"/
    );
  });

  it('backfills dev-mode disabling when an existing debug override is missing it', () => {
    const script = `# Brownfield framework packaging must embed JS in Debug builds.
if [[ "$CONFIGURATION" = *Debug* ]]; then
  unset SKIP_BUNDLING
  export FORCE_BUNDLING=1
fi

export ENTRY_FILE="index.js"
\`"$NODE_BINARY" --print "require.resolve('react-native/package.json')"\`/scripts/react-native-xcode.sh
`;

    const rewritten =
      rewriteBundleReactNativePhaseScriptForFrameworkTarget(script);

    expect(rewritten).toContain('export FORCE_BUNDLING=1');
    expect(rewritten).toContain(
      'export EXTRA_PACKAGER_ARGS="$EXTRA_PACKAGER_ARGS --dev false"'
    );
    expect(rewritten).toContain('export ENTRY_FILE="index.js"');
  });
});
