import type { ExpoConfig } from '@expo/config-types';

import { resolveConfig } from '../withBrownfield';

describe('resolveConfig', () => {
  it('uses Expo 56 native defaults when sdkVersion is 56 and no overrides are provided', () => {
    const config = createExpoConfig('56.0.0');

    expect(resolveConfig({}, config)).toEqual({
      debug: false,
      ios: {
        frameworkName: 'BrownfieldLib',
        bundleIdentifier: 'com.example.expo56.brownfield',
        buildSettings: {},
        deploymentTarget: '16.4',
        frameworkVersion: '1',
      },
      android: {
        moduleName: 'brownfieldlib',
        packageName: 'com.example.expo56',
        minSdkVersion: 24,
        targetSdkVersion: 36,
        compileSdkVersion: 36,
        groupId: 'com.example.expo56',
        artifactId: 'brownfieldlib',
        version: '0.0.1-SNAPSHOT',
      },
    });
  });

  it('keeps the Expo 55 defaults unchanged', () => {
    const config = createExpoConfig('55.0.0');

    expect(resolveConfig({}, config)).toEqual({
      debug: false,
      ios: {
        frameworkName: 'BrownfieldLib',
        bundleIdentifier: 'com.example.expo55.brownfield',
        buildSettings: {},
        deploymentTarget: '15.0',
        frameworkVersion: '1',
      },
      android: {
        moduleName: 'brownfieldlib',
        packageName: 'com.example.expo55',
        minSdkVersion: 24,
        targetSdkVersion: 35,
        compileSdkVersion: 35,
        groupId: 'com.example.expo55',
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
