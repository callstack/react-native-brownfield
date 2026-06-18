import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { ResolvedBrownfieldPluginConfigWithAndroid } from '../../types';
import {
  createAndroidModule,
  resolveCompileSdkVersionExpression,
  resolveTargetSdkVersionExpression,
  syncAndroidModuleExpoUpdatesFromAppFiles,
} from '../withAndroidModuleFiles';

describe('createAndroidModule', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const tempDirectory of tempDirectories.splice(0)) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('copies Expo Updates metadata into the generated library manifest', () => {
    const androidDir = createAndroidDir();

    writeAppManifest(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
    <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;production&quot;}" />
    <meta-data android:name="com.example.NOT_UPDATES" android:value="ignored" />
  </application>
</manifest>`
    );
    writeAppStrings(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="expo_runtime_version">1.0.0</string>
</resources>`
    );

    createAndroidModule({
      androidDir,
      config: createConfig(),
      rnVersion: '0.82.1',
      isExpoPre55: false,
    });

    expect(readLibraryManifest(androidDir))
      .toBe(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
    <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;production&quot;}" />
  </application>
</manifest>`);
    expect(readLibraryStrings(androidDir))
      .toBe(`<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="expo_runtime_version">1.0.0</string>
</resources>
`);
  });

  it('keeps the generated library manifest empty when Expo Updates metadata is absent', () => {
    const androidDir = createAndroidDir();

    writeAppManifest(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
    <meta-data android:name="com.example.NOT_UPDATES" android:value="ignored" />
  </application>
</manifest>`
    );

    createAndroidModule({
      androidDir,
      config: createConfig(),
      rnVersion: '0.82.1',
      isExpoPre55: false,
    });

    expect(readLibraryManifest(androidDir))
      .toBe(`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

</manifest>`);
    expect(readLibraryStrings(androidDir))
      .toBe(`<?xml version="1.0" encoding="utf-8"?>
<resources>

</resources>
`);
  });

  it('overwrites existing library Expo Updates files with the finalized app file values', () => {
    const androidDir = createAndroidDir();
    const config = createConfig();

    writeAppManifest(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="NEVER" />
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
  </application>
</manifest>`
    );
    writeAppStrings(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="expo_runtime_version">1.0.0</string>
</resources>`
    );

    createAndroidModule({
      androidDir,
      config,
      rnVersion: '0.82.1',
      isExpoPre55: false,
    });

    writeAppManifest(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS" />
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
  </application>
</manifest>`
    );
    writeAppStrings(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="expo_runtime_version">2.0.0</string>
</resources>`
    );

    syncAndroidModuleExpoUpdatesFromAppFiles({
      androidDir,
      config,
    });

    expect(readLibraryManifest(androidDir)).toContain(
      'android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"'
    );
    expect(readLibraryManifest(androidDir)).not.toContain(
      'android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="NEVER"'
    );
    expect(readLibraryStrings(androidDir)).toContain(
      '<string name="expo_runtime_version">2.0.0</string>'
    );
  });

  it('inherits compileSdk from the Expo app project when the user did not override it', () => {
    const androidDir = createAndroidDir();

    createAndroidModule({
      androidDir,
      config: createConfig({
        android: {
          compileSdkVersion: undefined,
        },
      }),
      rnVersion: '0.85.3',
      isExpoPre55: false,
    });

    expect(readLibraryBuildGradle(androidDir)).toContain(
      'compileSdk = resolveRootProjectInt("compileSdkVersion")'
    );
  });

  it('inherits targetSdk from the Expo app project when the user did not override it', () => {
    const androidDir = createAndroidDir();

    createAndroidModule({
      androidDir,
      config: createConfig({
        android: {
          targetSdkVersion: undefined,
        },
      }),
      rnVersion: '0.85.3',
      isExpoPre55: false,
    });

    expect(readLibraryBuildGradle(androidDir)).toContain(
      'targetSdk = resolveRootProjectInt("targetSdkVersion")'
    );
  });

  it('keeps explicit SDK overrides when they are provided', () => {
    const config = createConfig({
      android: {
        targetSdkVersion: 37,
        compileSdkVersion: 38,
      },
    });

    expect(resolveCompileSdkVersionExpression(config)).toBe('38');
    expect(resolveTargetSdkVersionExpression(config)).toBe('37');
  });

  function createAndroidDir(): string {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'react-native-brownfield-android-module-')
    );
    const androidDir = path.join(tempDirectory, 'android');

    tempDirectories.push(tempDirectory);
    fs.mkdirSync(androidDir, { recursive: true });

    return androidDir;
  }

  function createConfig(
    overrides: {
      debug?: ResolvedBrownfieldPluginConfigWithAndroid['debug'];
      ios?: ResolvedBrownfieldPluginConfigWithAndroid['ios'];
      android?: Partial<ResolvedBrownfieldPluginConfigWithAndroid['android']>;
    } = {}
  ): ResolvedBrownfieldPluginConfigWithAndroid {
    return {
      debug: overrides.debug ?? false,
      ios: overrides.ios ?? null,
      android: {
        moduleName: 'brownfieldlib',
        packageName: 'com.example.brownfield',
        minSdkVersion: 24,
        targetSdkVersion: 35,
        compileSdkVersion: 35,
        groupId: 'com.example',
        artifactId: 'brownfieldlib',
        version: '1.0.0',
        ...(overrides.android ?? {}),
      },
    };
  }

  function writeAppManifest(androidDir: string, manifestContent: string): void {
    const manifestDirectory = path.join(androidDir, 'app', 'src', 'main');

    fs.mkdirSync(manifestDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(manifestDirectory, 'AndroidManifest.xml'),
      manifestContent,
      'utf8'
    );
  }

  function writeAppStrings(androidDir: string, stringsContent: string): void {
    const stringsDirectory = path.join(
      androidDir,
      'app',
      'src',
      'main',
      'res',
      'values'
    );

    fs.mkdirSync(stringsDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(stringsDirectory, 'strings.xml'),
      stringsContent,
      'utf8'
    );
  }

  function readLibraryManifest(androidDir: string): string {
    return fs.readFileSync(
      path.join(
        androidDir,
        'brownfieldlib',
        'src',
        'main',
        'AndroidManifest.xml'
      ),
      'utf8'
    );
  }

  function readLibraryStrings(androidDir: string): string {
    return fs.readFileSync(
      path.join(
        androidDir,
        'brownfieldlib',
        'src',
        'main',
        'res',
        'values',
        'strings.xml'
      ),
      'utf8'
    );
  }

  function readLibraryBuildGradle(androidDir: string): string {
    return fs.readFileSync(
      path.join(androidDir, 'brownfieldlib', 'build.gradle.kts'),
      'utf8'
    );
  }
});
