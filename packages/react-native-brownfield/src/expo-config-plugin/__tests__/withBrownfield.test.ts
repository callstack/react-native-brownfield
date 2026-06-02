import type { ExpoConfig } from '@expo/config-types';

import { resolveConfig } from '../withBrownfield';

describe('resolveConfig', () => {
  it('uses stable fallback floors and defers SDK-specific inheritance to platform mods', () => {
    const config = createExpoConfig('57.0.0');

    expect(resolveConfig({}, config)).toEqual({
      debug: false,
      ios: {
        frameworkName: 'BrownfieldLib',
        bundleIdentifier: 'com.example.expo57.brownfield',
        buildSettings: {},
        deploymentTarget: undefined,
        frameworkVersion: '1',
      },
      android: {
        moduleName: 'brownfieldlib',
        packageName: 'com.example.expo57',
        minSdkVersion: 24,
        targetSdkVersion: 35,
        compileSdkVersion: undefined,
        groupId: 'com.example.expo57',
        artifactId: 'brownfieldlib',
        version: '0.0.1-SNAPSHOT',
      },
    });
  });

  it('preserves explicit native floor overrides', () => {
    const config = createExpoConfig('57.0.0');

    expect(
      resolveConfig(
        {
          ios: {
            deploymentTarget: '17.0',
          },
          android: {
            targetSdkVersion: 38,
            compileSdkVersion: 38,
          },
        },
        config
      )
    ).toEqual({
      debug: false,
      ios: {
        frameworkName: 'BrownfieldLib',
        bundleIdentifier: 'com.example.expo57.brownfield',
        buildSettings: {},
        deploymentTarget: '17.0',
        frameworkVersion: '1',
      },
      android: {
        moduleName: 'brownfieldlib',
        packageName: 'com.example.expo57',
        minSdkVersion: 24,
        targetSdkVersion: 38,
        compileSdkVersion: 38,
        groupId: 'com.example.expo57',
        artifactId: 'brownfieldlib',
        version: '0.0.1-SNAPSHOT',
      },
    });
  });
});

function createExpoConfig(sdkVersion: string): ExpoConfig {
  return {
    name: `Expo ${sdkVersion}`,
    slug: `expo-${sdkVersion}`,
    sdkVersion,
    ios: {
      bundleIdentifier: `com.example.expo${sdkVersion.split('.')[0]}`,
    },
    android: {
      package: `com.example.expo${sdkVersion.split('.')[0]}`,
    },
  };
}
