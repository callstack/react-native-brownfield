import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as rockTools from '@rock-js/tools';
import { describe, expect, test } from 'vitest';

import {
  BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_GRADLE_PROPERTY,
  resolveNavigationAndroidSourceDir,
  withNavigationAndroidSourceDirProperty,
} from '../navigationAndroidSourceOverride.js';

const BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR = `ORG_GRADLE_PROJECT_${BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_GRADLE_PROPERTY}`;

describe('resolveNavigationAndroidSourceDir', () => {
  test('returns undefined when outputDir is absent', () => {
    expect(resolveNavigationAndroidSourceDir('/tmp/project')).toBeUndefined();
  });

  test('resolves outputDir relative to project root and appends android source path', () => {
    expect(
      resolveNavigationAndroidSourceDir(
        '/tmp/project',
        '.brownfield/navigation-output'
      )
    ).toBe(
      path.join(
        '/tmp/project',
        '.brownfield',
        'navigation-output',
        'android',
        'src',
        'main',
        'java'
      )
    );
  });
});

describe('withNavigationAndroidSourceDirProperty', () => {
  test('runs without env override when outputDir is absent', async () => {
    delete process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR];

    const seenInside = await withNavigationAndroidSourceDirProperty({
      projectRoot: '/tmp/project',
      run: async () =>
        process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR],
    });

    expect(seenInside).toBeUndefined();
    expect(
      process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR]
    ).toBeUndefined();
  });

  test('sets and restores env var around execution', async () => {
    const tempProjectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'brownfield-android-env-test-')
    );
    const outputDir = '.brownfield/navigation';
    const androidSourceDir = path.join(
      tempProjectRoot,
      outputDir,
      'android',
      'src',
      'main',
      'java'
    );
    fs.mkdirSync(androidSourceDir, { recursive: true });
    delete process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR];

    const seenInside = await withNavigationAndroidSourceDirProperty({
      projectRoot: tempProjectRoot,
      outputDir,
      run: async () =>
        process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR],
    });

    expect(seenInside).toBe(androidSourceDir);
    expect(
      process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR]
    ).toBeUndefined();
  });

  test('restores previous env var value after execution', async () => {
    const tempProjectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'brownfield-android-env-test-')
    );
    const outputDir = '.brownfield/navigation';
    const androidSourceDir = path.join(
      tempProjectRoot,
      outputDir,
      'android',
      'src',
      'main',
      'java'
    );
    fs.mkdirSync(androidSourceDir, { recursive: true });
    process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR] =
      '/tmp/previous-value';

    await withNavigationAndroidSourceDirProperty({
      projectRoot: tempProjectRoot,
      outputDir,
      run: async () => undefined,
    });

    expect(process.env[BROWNFIELD_NAVIGATION_ANDROID_SOURCE_DIR_ENV_VAR]).toBe(
      '/tmp/previous-value'
    );
  });

  test('throws when custom output does not provide android generated sources', async () => {
    const tempProjectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'brownfield-android-env-test-')
    );

    await expect(
      withNavigationAndroidSourceDirProperty({
        projectRoot: tempProjectRoot,
        outputDir: '.brownfield/missing-navigation-output',
        run: async () => undefined,
      })
    ).rejects.toThrow(rockTools.RockError);
  });
});
