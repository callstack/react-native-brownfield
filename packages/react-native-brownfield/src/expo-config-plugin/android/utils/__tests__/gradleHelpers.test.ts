import { describe, expect, it } from 'vitest';

import { modifyRootBuildGradle, modifySettingsGradle } from '../gradleHelpers';

const rootBuildGradle = `
buildscript {
  ext {
    buildToolsVersion = "35.0.0"
  }
  dependencies {
    classpath("com.android.tools.build:gradle:8.6.0")
  }
}
`;

const settingsGradle = `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
rootProject.name = 'MyApp'
include ':app'
`;

describe('modifyRootBuildGradle', () => {
  it('adds the Maven Brownfield Gradle plugin classpath by default', () => {
    const result = modifyRootBuildGradle(rootBuildGradle);

    expect(result).toContain('brownfield-gradle-plugin');
  });

  it('skips the Maven classpath when useLocalGradlePlugin is enabled', () => {
    const result = modifyRootBuildGradle(rootBuildGradle, {
      useLocalGradlePlugin: true,
    });

    expect(result).toBe(rootBuildGradle);
    expect(result).not.toContain('brownfield-gradle-plugin');
  });
});

describe('modifySettingsGradle', () => {
  it('includes the brownfield module', () => {
    const result = modifySettingsGradle(settingsGradle, 'brownfieldlib');

    expect(result).toContain("include ':brownfieldlib'");
  });

  it('adds includeBuild for the local Brownfield Gradle plugin when enabled', () => {
    const result = modifySettingsGradle(settingsGradle, 'brownfieldlib', {
      useLocalGradlePlugin: true,
    });

    expect(result).toContain(
      'includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/brownfield")'
    );
    expect(result).toContain("include ':brownfieldlib'");
  });

  it('prepends pluginManagement when settings.gradle has no pluginManagement block', () => {
    const settingsWithoutPluginManagement = `rootProject.name = 'MyApp'
include ':app'
`;

    const result = modifySettingsGradle(
      settingsWithoutPluginManagement,
      'brownfieldlib',
      { useLocalGradlePlugin: true }
    );

    expect(result.startsWith('pluginManagement {')).toBe(true);
    expect(result).toContain(
      'includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/brownfield")'
    );
  });

  it('does not duplicate the local Brownfield Gradle plugin includeBuild', () => {
    const settingsWithLocalPlugin = `${settingsGradle}
includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/brownfield")
`;

    const result = modifySettingsGradle(
      settingsWithLocalPlugin,
      'brownfieldlib',
      {
        useLocalGradlePlugin: true,
      }
    );

    expect(
      result.match(
        /includeBuild\("\.\.\/node_modules\/@callstack\/react-native-brownfield\/gradle-plugin\/brownfield"\)/g
      )
    ).toHaveLength(1);
  });
});
