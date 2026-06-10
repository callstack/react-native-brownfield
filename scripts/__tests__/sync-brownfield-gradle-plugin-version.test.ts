import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  syncBrownfieldGradlePluginVersion,
  type SyncOptions,
} from '../sync-brownfield-gradle-plugin-version.ts';

function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  contents: string
): void {
  const targetPath = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents, 'utf8');
}

function createFixtureRepo(): string {
  const repoRoot = mkdtempSync(
    path.join(tmpdir(), 'brownfield-gradle-plugin-version-sync-')
  );

  writeRepoFile(
    repoRoot,
    'gradle-plugins/react/brownfield/gradle.properties',
    ['PROJECT_ID=com.callstack.react.brownfield', 'VERSION=2.3.4', ''].join('\n')
  );

  writeRepoFile(
    repoRoot,
    'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts',
    [
      "export const BROWNFIELD_PLUGIN_VERSION = '1.1.0';",
      'export const brownfieldGradlePluginDependency = `classpath("com.callstack.react:brownfield-gradle-plugin:${BROWNFIELD_PLUGIN_VERSION}")`;',
      '',
    ].join('\n')
  );

  writeRepoFile(
    repoRoot,
    'apps/scripts/prepare-android-build-gradle-for-ci.ts',
    [
      "const SNAPSHOT_VERSION = '1.1.0-SNAPSHOT';",
      'console.log(SNAPSHOT_VERSION);',
      '',
    ].join('\n')
  );

  writeRepoFile(
    repoRoot,
    'apps/RNApp/android/build.gradle',
    [
      'buildscript {',
      '    dependencies {',
      '        classpath("com.callstack.react:brownfield-gradle-plugin:1.1.0-SNAPSHOT")',
      '    }',
      '}',
      '',
    ].join('\n')
  );

  writeRepoFile(
    repoRoot,
    'gradle-plugins/react/README.md',
    'Use the latest version published on Maven Central.\n'
  );

  return repoRoot;
}

function readRepoFile(repoRoot: string, relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('syncs all known Brownfield Gradle Plugin version references', async () => {
  const repoRoot = createFixtureRepo();

  try {
    const result = syncBrownfieldGradlePluginVersion({ repoRoot });

    assert.equal(result.version, '2.3.4');
    assert.equal(result.snapshotVersion, '2.3.4-SNAPSHOT');
    assert.deepEqual(result.changedFiles.sort(), [
      'apps/RNApp/android/build.gradle',
      'apps/scripts/prepare-android-build-gradle-for-ci.ts',
      'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts',
    ]);

    assert.match(
      readRepoFile(
        repoRoot,
        'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts'
      ),
      /BROWNFIELD_PLUGIN_VERSION = '2\.3\.4'/
    );
    assert.match(
      readRepoFile(repoRoot, 'apps/scripts/prepare-android-build-gradle-for-ci.ts'),
      /SNAPSHOT_VERSION = '2\.3\.4-SNAPSHOT'/
    );
    assert.match(
      readRepoFile(repoRoot, 'apps/RNApp/android/build.gradle'),
      /brownfield-gradle-plugin:2\.3\.4-SNAPSHOT/
    );
    assert.equal(
      readRepoFile(repoRoot, 'gradle-plugins/react/README.md'),
      'Use the latest version published on Maven Central.\n'
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('check mode reports drift without rewriting files', async () => {
  const repoRoot = createFixtureRepo();

  try {
    const before = readRepoFile(
      repoRoot,
      'apps/scripts/prepare-android-build-gradle-for-ci.ts'
    );

    const result = syncBrownfieldGradlePluginVersion({
      repoRoot,
      check: true,
    } satisfies SyncOptions);

    assert.equal(result.inSync, false);
    assert.deepEqual(result.changedFiles, [
      'packages/react-native-brownfield/src/expo-config-plugin/android/utils/constants.ts',
      'apps/scripts/prepare-android-build-gradle-for-ci.ts',
      'apps/RNApp/android/build.gradle',
    ]);
    assert.equal(
      readRepoFile(repoRoot, 'apps/scripts/prepare-android-build-gradle-for-ci.ts'),
      before
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('fails loudly when an expected version reference cannot be found', async () => {
  const repoRoot = createFixtureRepo();

  try {
    writeRepoFile(
      repoRoot,
      'apps/RNApp/android/build.gradle',
      ['buildscript {', '    dependencies {', '    }', '}', ''].join('\n')
    );

    assert.throws(() => syncBrownfieldGradlePluginVersion({ repoRoot }), {
      message:
        /Could not locate expected Brownfield Gradle Plugin version pattern in apps\/RNApp\/android\/build\.gradle/,
    });
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
