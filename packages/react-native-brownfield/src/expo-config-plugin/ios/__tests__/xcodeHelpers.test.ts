import { describe, expect, it } from 'vitest';

import {
  addFrameworkTarget,
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

describe('getAppTargetDeploymentTarget', () => {
  it('prefers the release deployment target and strips quotes', () => {
    const project = {
      getBuildProperty: (_prop: string, build?: string) =>
        build === 'Release' ? '"16.4"' : '"16.0"',
    } as any;

    expect(getAppTargetDeploymentTarget(project, 'ExpoApp56')).toBe('16.4');
  });

  it('falls back to the debug deployment target when release is unavailable', () => {
    const project = {
      getBuildProperty: (_prop: string, build?: string) =>
        build === 'Debug' ? '15.0' : undefined,
    } as any;

    expect(getAppTargetDeploymentTarget(project, 'ExpoApp54')).toBe('15.0');
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
      /^# Brownfield framework packaging must embed JS in Debug builds\.\nif \[\[ "\$CONFIGURATION" = \*Debug\* \]\]; then\n {2}unset SKIP_BUNDLING\n {2}export FORCE_BUNDLING=1\nfi\n\nexport ENTRY_FILE="index\.js"/
    );
  });
});

describe('addFrameworkTarget', () => {
  it('reuses an existing framework target discovered in the native target section', () => {
    const project = {
      pbxNativeTargetSection: () => ({
        ABC123: {
          isa: 'PBXNativeTarget',
          name: '"BrownfieldLib"',
          productType: 'com.apple.product-type.framework',
        },
        ABC123_comment: 'BrownfieldLib',
      }),
      pbxTargetByName: () => null,
    } as any;

    const result = addFrameworkTarget(project, {} as any, baseOptions);

    expect(result).toEqual({
      frameworkTargetUUID: 'ABC123',
      targetAlreadyExists: true,
    });
  });
});
