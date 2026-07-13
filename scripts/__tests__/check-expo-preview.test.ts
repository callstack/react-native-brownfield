import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findLatestPreviewVersion,
  replaceHomeScreenTitle,
  replaceTemplateAppReferences,
  updateExpoVersion,
  type ExpoPackageJson,
} from '../check-expo-preview.ts';

test('updates ExpoApp package.json when a new preview version is provided', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {
      expo: '~57.0.0',
    },
  };

  const updated = updateExpoVersion(packageJson, '57.0.0-preview.1');

  assert.equal(updated, true);
  assert.equal(packageJson.dependencies?.expo, '57.0.0-preview.1');
});

test('does not rewrite ExpoApp package.json when the preview version is unchanged', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {
      expo: '57.0.0-preview.1',
    },
  };

  const updated = updateExpoVersion(packageJson, '57.0.0-preview.1');

  assert.equal(updated, false);
  assert.equal(packageJson.dependencies?.expo, '57.0.0-preview.1');
});

test('selects the newest Expo preview version', () => {
  const latest = findLatestPreviewVersion([
    '57.0.0',
    '57.0.0-canary-20260629-3010085',
    '57.0.0-preview.1',
    '57.0.0-preview.2',
    '56.0.0-preview.9',
  ]);

  assert.equal(latest, '57.0.0-preview.2');
});

test('rewrites Expo template identifiers for ExpoApp57', () => {
  const input = JSON.stringify(
    {
      name: '@callstack/brownfield-example-expo-app-57',
      brownie: {
        kotlin:
          './android/brownfieldlib/src/main/java/com/callstack/rnbrownfield/demo/expoapp57/Generated/',
        kotlinPackageName: 'com.callstack.rnbrownfield.demo.expoapp57',
      },
      scripts: {
        'brownfield:prepare:android:ci':
          'cd .. && node ./scripts/prepare-android-build-gradle-for-ci.ts ExpoApp57',
      },
    },
    null,
    2
  );

  const output = replaceTemplateAppReferences(input, 57, 'ExpoApp57');

  assert.match(output, /@callstack\/brownfield-example-expo-app-preview/);
  assert.doesNotMatch(output, /brownfield-example-expo-app-57/);
  assert.match(output, /com\.callstack\.rnbrownfield\.demo\.expoapppreview/);
  assert.doesNotMatch(output, /expoapp57/);
  assert.match(output, /ExpoAppPreview/);
  assert.doesNotMatch(output, /ExpoApp57/);
});

test('rewrites the home screen title for the latest Expo template version', () => {
  const input = 'Welcome to&nbsp;Expo&nbsp;57';

  const output = replaceHomeScreenTitle(input, 57);

  assert.equal(output, 'Welcome to&nbsp;Expo&nbsp;Preview');
});

test('fails loudly when expo dependency is missing', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {},
  };

  assert.throws(() => updateExpoVersion(packageJson, '57.0.0-preview.1'), {
    message:
      /Could not locate dependencies\.expo in ExpoAppPreview\/package\.json/,
  });
});
