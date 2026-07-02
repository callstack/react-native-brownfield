import {
  modifyRootBuildGradle,
  modifySettingsGradle,
} from '../utils/gradleHelpers';

describe('gradleHelpers', () => {
  it('adds the Brownfield Gradle plugin dependency to the root build.gradle', () => {
    const contents = `buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
  }
}`;

    expect(modifyRootBuildGradle(contents)).toContain(
      'classpath("com.callstack.react:brownfield-gradle-plugin:2.0.0-alpha03")'
    );
  });

  it('adds the Brownfield module include without mutating pluginManagement', () => {
    const contents = `pluginManagement {
  includeBuild("../node_modules/@react-native/gradle-plugin")
}

plugins {
  id("com.facebook.react.settings")
}

rootProject.name = 'ExpoApp55'
include ':app'
`;

    const modified = modifySettingsGradle(contents, 'brownfieldlib');

    expect(modified).toContain(
      'includeBuild("../node_modules/@react-native/gradle-plugin")'
    );
    expect(modified).toContain(`include ':brownfieldlib'`);
  });

  it('does not duplicate Brownfield settings mutations when run twice', () => {
    const contents = `pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

rootProject.name = 'ExpoApp55'
include ':app'
include ':brownfieldlib'
`;

    const modified = modifySettingsGradle(contents, 'brownfieldlib');

    expect(modified.match(/include ':brownfieldlib'/g)).toHaveLength(1);
  });
});
