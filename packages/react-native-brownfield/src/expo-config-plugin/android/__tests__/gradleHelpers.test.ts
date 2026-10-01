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
      'classpath("com.callstack.react:brownfield-gradle-plugin:2.0.0-alpha10")'
    );
  });

  it('emits an explicit pluginVersion when provided (RN CLI scaffold path)', () => {
    // The scaffold must pin a Maven Central-published version; the default
    // (above) tracks the in-development plugin and is for the Expo path.
    const contents = `buildscript {
  dependencies {
    classpath('com.android.tools.build:gradle')
  }
}`;

    expect(
      modifyRootBuildGradle(contents, { pluginVersion: '2.0.0-alpha09' })
    ).toContain(
      'classpath("com.callstack.react:brownfield-gradle-plugin:2.0.0-alpha09")'
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
