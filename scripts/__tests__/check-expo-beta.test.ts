import assert from 'node:assert/strict';
import test from 'node:test';

import {
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

test('fails loudly when expo dependency is missing', () => {
  const packageJson: ExpoPackageJson = {
    dependencies: {},
  };

  assert.throws(() => updateExpoVersion(packageJson, '56.0.0-beta.1'), {
    message: /Could not locate dependencies\.expo in ExpoAppBeta\/package\.json/,
  });
});
