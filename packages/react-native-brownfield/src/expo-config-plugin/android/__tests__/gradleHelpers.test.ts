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
      'classpath("com.callstack.react:brownfield-gradle-plugin:2.0.0-alpha01")'
    );
  });

  it('adds pluginManagement repositories, local plugin source includeBuild, and the Brownfield module include', () => {
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

    expect(modified).toContain('repositories {');
    expect(modified).toContain('google()');
    expect(modified).toContain('mavenCentral()');
    expect(modified).toContain('gradlePluginPortal()');
    expect(modified).toContain(
      "const candidates = [path.join(packageDir, 'gradle-plugin', 'react', 'brownfield'), path.join(packageDir, '..', '..', 'gradle-plugins', 'react', 'brownfield')]"
    );
    expect(modified).toContain('includeBuild(brownfieldGradlePlugin)');
    expect(modified).toContain(`include ':brownfieldlib'`);
  });

  it('does not duplicate Brownfield settings mutations when run twice', () => {
    const contents = `pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
  includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/react")
}

rootProject.name = 'ExpoApp55'
include ':app'
include ':brownfieldlib'
`;

    const modified = modifySettingsGradle(contents, 'brownfieldlib');

    expect(
      modified.match(
        /const candidates = \[path\.join\(packageDir, 'gradle-plugin', 'react', 'brownfield'\), path\.join\(packageDir, '\.\.', '\.\.', 'gradle-plugins', 'react', 'brownfield'\)\]/g
      )
    ).toHaveLength(1);
    expect(
      modified.match(/includeBuild\(brownfieldGradlePlugin\)/g)
    ).toHaveLength(1);
    expect(modified.match(/include ':brownfieldlib'/g)).toHaveLength(1);
  });

  it('replaces legacy Brownfield includeBuild snippets with the current dynamic form', () => {
    const contents = `pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
  includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/react")
  def brownfieldGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('@callstack/react-native-brownfield/package.json', { paths: [rootDir] })")
    }.standardOutput.asText.get().trim(),
    "../gradle-plugin/react"
  ).absolutePath
  includeBuild(brownfieldGradlePlugin)
}

include ':app'
`;

    const modified = modifySettingsGradle(contents, 'brownfieldlib');

    expect(
      modified.includes(
        'includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/react")'
      )
    ).toBe(false);
    expect(modified.includes('{ paths: [rootDir] }')).toBe(false);
    expect(modified).toContain(
      "const candidates = [path.join(packageDir, 'gradle-plugin', 'react', 'brownfield'), path.join(packageDir, '..', '..', 'gradle-plugins', 'react', 'brownfield')]"
    );
  });
});
