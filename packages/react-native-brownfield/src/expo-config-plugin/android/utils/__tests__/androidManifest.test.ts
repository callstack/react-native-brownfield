import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  extractApplicationMetaDataFromAndroidManifest,
  extractStringResourcesFromResourcesXml,
  renderLibraryManifestApplication,
  renderLibraryStringResources,
} from '../androidManifest';
import {
  extractExpoUpdatesApplicationMetaData,
  readExpoUpdatesApplicationMetaData,
  readExpoUpdatesStringResources,
} from '../expo-updates';

describe('android manifest helpers', () => {
  const tempDirectories: string[] = [];

  afterEach(() => {
    for (const tempDirectory of tempDirectories.splice(0)) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('returns an empty array when the generated app manifest does not exist', () => {
    const androidDir = createAndroidDir();

    expect(readExpoUpdatesApplicationMetaData(androidDir, 'app')).toEqual([]);
  });

  it('returns an empty array when the application node has no Expo Updates metadata', () => {
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

    expect(readExpoUpdatesApplicationMetaData(androidDir, 'app')).toEqual([]);
  });

  it('preserves Expo Updates metadata values exactly as they appear in the app manifest', () => {
    const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <meta-data android:name="expo.modules.updates.OUTSIDE_APPLICATION" android:value="ignored" />
  <application android:name=".MainApplication">
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="true" />
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0" />
    <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;production&quot;}" />
    <meta-data android:name="com.example.NOT_UPDATES" android:value="ignored" />
  </application>
</manifest>`;

    const metaDataEntries =
      extractExpoUpdatesApplicationMetaData(manifestContent);

    expect(metaDataEntries).toEqual([
      {
        name: 'expo.modules.updates.ENABLED',
        value: 'true',
      },
      {
        name: 'expo.modules.updates.EXPO_RUNTIME_VERSION',
        value: '@string/expo_runtime_version',
      },
      {
        name: 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
        value: '0',
      },
      {
        name: 'expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY',
        value: '{&quot;expo-channel-name&quot;:&quot;production&quot;}',
      },
    ]);

    expect(renderLibraryManifestApplication(metaDataEntries))
      .toBe(`  <application>
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="true" />
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0" />
    <meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;production&quot;}" />
  </application>`);
  });

  it('renders an empty application block when no Expo Updates metadata is provided', () => {
    expect(renderLibraryManifestApplication([])).toBe('');
  });

  it('copies the expo runtime version string resource when referenced by Expo Updates metadata', () => {
    const androidDir = createAndroidDir();

    writeAppStrings(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="expo_runtime_version">1.0.0-preview</string>
  <string name="app_name">Example</string>
</resources>`
    );

    const stringResources = readExpoUpdatesStringResources(androidDir, 'app', [
      {
        name: 'expo.modules.updates.EXPO_RUNTIME_VERSION',
        value: '@string/expo_runtime_version',
      },
      {
        name: 'expo.modules.updates.EXPO_UPDATE_URL',
        value: 'https://u.expo.dev/project-id',
      },
    ]);

    expect(stringResources).toEqual([
      {
        name: 'expo_runtime_version',
        value: '1.0.0-preview',
      },
    ]);

    expect(renderLibraryStringResources(stringResources)).toBe(
      '  <string name="expo_runtime_version">1.0.0-preview</string>'
    );
  });

  it('keeps typed extraction aligned for android:value entries and referenced string resources', () => {
    const androidDir = createAndroidDir();
    const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="true" />
    <meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="@string/expo_runtime_version" />
    <meta-data android:name="com.example.NOT_UPDATES" android:value="ignored" />
  </application>
</manifest>`;
    const typedManifest = {
      manifest: {
        $: {
          'xmlns:android': 'http://schemas.android.com/apk/res/android',
        },
        queries: [],
        application: [
          {
            $: {
              'android:name': '.MainApplication',
            },
            'meta-data': [
              {
                $: {
                  'android:name': 'expo.modules.updates.ENABLED',
                  'android:value': 'true',
                },
              },
              {
                $: {
                  'android:name': 'expo.modules.updates.EXPO_RUNTIME_VERSION',
                  'android:value': '@string/expo_runtime_version',
                },
              },
              {
                $: {
                  'android:name': 'com.example.NOT_UPDATES',
                  'android:value': 'ignored',
                },
              },
            ],
          },
        ],
      },
    };

    writeAppStrings(
      androidDir,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="expo_runtime_version">1.0.0-preview</string>
</resources>`
    );

    const fileMetaData = extractExpoUpdatesApplicationMetaData(manifestContent);
    const typedMetaData = extractApplicationMetaDataFromAndroidManifest(
      typedManifest
    ).filter(({ name }) => name.startsWith('expo.modules.updates.'));

    expect(typedMetaData).toEqual(fileMetaData);
    expect(
      extractStringResourcesFromResourcesXml(
        {
          resources: {
            string: [
              {
                $: { name: 'expo_runtime_version' },
                _: '1.0.0-preview',
              },
            ],
          },
        },
        ['expo_runtime_version']
      )
    ).toEqual(readExpoUpdatesStringResources(androidDir, 'app', fileMetaData));
  });

  it('supports android:resource entries in the typed manifest adapter', () => {
    const metaDataEntries = extractApplicationMetaDataFromAndroidManifest({
      manifest: {
        $: {
          'xmlns:android': 'http://schemas.android.com/apk/res/android',
        },
        queries: [],
        application: [
          {
            $: {
              'android:name': '.MainApplication',
            },
            'meta-data': [
              {
                $: {
                  'android:name': 'expo.modules.updates.EXPO_RUNTIME_VERSION',
                  'android:resource': '@string/expo_runtime_version',
                },
              },
              {
                $: {
                  'android:name': 'com.example.NOT_UPDATES',
                  'android:resource': '@string/ignored',
                },
              },
            ],
          },
        ],
      },
    }).filter(({ name }) => name.startsWith('expo.modules.updates.'));

    expect(metaDataEntries).toEqual([
      {
        name: 'expo.modules.updates.EXPO_RUNTIME_VERSION',
        value: '@string/expo_runtime_version',
      },
    ]);
    expect(
      extractStringResourcesFromResourcesXml(
        {
          resources: {
            string: [
              {
                $: { name: 'expo_runtime_version' },
                _: '2.0.0',
              },
            ],
          },
        },
        ['expo_runtime_version']
      )
    ).toEqual([
      {
        name: 'expo_runtime_version',
        value: '2.0.0',
      },
    ]);
  });

  function createAndroidDir(): string {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'react-native-brownfield-android-')
    );
    const androidDir = path.join(tempDirectory, 'android');

    tempDirectories.push(tempDirectory);
    fs.mkdirSync(androidDir, { recursive: true });

    return androidDir;
  }

  function writeAppManifest(androidDir: string, manifestContent: string): void {
    const manifestPath = path.join(androidDir, 'app', 'src', 'main');

    fs.mkdirSync(manifestPath, { recursive: true });
    fs.writeFileSync(
      path.join(manifestPath, 'AndroidManifest.xml'),
      manifestContent,
      'utf8'
    );
  }

  function writeAppStrings(androidDir: string, stringsContent: string): void {
    const stringsPath = path.join(
      androidDir,
      'app',
      'src',
      'main',
      'res',
      'values'
    );

    fs.mkdirSync(stringsPath, { recursive: true });
    fs.writeFileSync(
      path.join(stringsPath, 'strings.xml'),
      stringsContent,
      'utf8'
    );
  }
});
