import assert from 'node:assert/strict';
import test from 'node:test';

import {
  replaceHomeScreenTitle,
  replaceTemplateAppReferences,
  updateExpoVersion,
  type ExpoPackageJson,
} from '../check-expo-beta.ts';

test('updates ExpoApp package.json when a new beta version is provided', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {
      expo: '~55.0.23',
    },
  };

  const updated = updateExpoVersion(packageJson, '56.0.0-beta.1');

  assert.equal(updated, true);
  assert.equal(packageJson.dependencies?.expo, '56.0.0-beta.1');
});

test('does not rewrite ExpoApp package.json when the beta version is unchanged', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {
      expo: '56.0.0-beta.1',
    },
  };

  const updated = updateExpoVersion(packageJson, '56.0.0-beta.1');

  assert.equal(updated, false);
  assert.equal(packageJson.dependencies?.expo, '56.0.0-beta.1');
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

  assert.match(output, /@callstack\/brownfield-example-expo-app-beta/);
  assert.doesNotMatch(output, /brownfield-example-expo-app-57/);
  assert.match(output, /com\.callstack\.rnbrownfield\.demo\.expobeta/);
  assert.doesNotMatch(output, /expoapp57/);
  assert.match(output, /ExpoAppBeta/);
  assert.doesNotMatch(output, /ExpoApp57/);
});

test('rewrites the home screen title for the latest Expo template version', () => {
  const input = 'Welcome to&nbsp;Expo&nbsp;57';

  const output = replaceHomeScreenTitle(input, 57);

  assert.equal(output, 'Welcome to&nbsp;Expo&nbsp;Beta');
});

test('fails loudly when expo dependency is missing', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {},
  };

  assert.throws(() => updateExpoVersion(packageJson, '56.0.0-beta.1'), {
    message:
      /Could not locate dependencies\.expo in ExpoAppBeta\/package\.json/,
  });
});
