import { Command, Option } from 'commander';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as rockTools from '@rock-js/tools';
import { describe, expect, test } from 'vitest';

import {
  BROWNFIELD_NAVIGATION_IOS_SOURCE_ROOT_ENV_VAR,
  parseUsePrebuiltRnCoreArgument,
  resolveNavigationIosSourceRoot,
  withNavigationIosSourceRootEnv,
} from '../packageIos.js';

/** Mirrors `--use-prebuilt-rn-core` on `packageIosCommand` (preset + parser). */
function parsePackageIosArgv(argv: string[]) {
  const program = new Command('package:ios').addOption(
    new Option('--use-prebuilt-rn-core [bool]', 'test')
      .preset(true)
      .argParser(parseUsePrebuiltRnCoreArgument)
  );
  program.parse(argv, { from: 'user' });
  return program.opts() as { usePrebuiltRnCore?: boolean };
}

describe('parseUsePrebuiltRnCoreArgument', () => {
  test.each([
    ['true', true],
    ['True', true],
    [' TRUE ', true],
    ['1', true],
    ['false', false],
    ['FALSE', false],
    [' 0 ', false],
    ['0', false],
  ])('parses %j as %s', (input, expected) => {
    expect(parseUsePrebuiltRnCoreArgument(input)).toBe(expected);
  });

  test('passes through boolean (Commander preset)', () => {
    expect(parseUsePrebuiltRnCoreArgument(true)).toBe(true);
    expect(parseUsePrebuiltRnCoreArgument(false)).toBe(false);
    expect(() => parseUsePrebuiltRnCoreArgument('maybe')).toThrow(
      rockTools.RockError
    );
    expect(() => parseUsePrebuiltRnCoreArgument('')).toThrow(
      rockTools.RockError
    );
    expect(() => parseUsePrebuiltRnCoreArgument('2')).toThrow(
      rockTools.RockError
    );
  });
});

describe('--use-prebuilt-rn-core (Commander)', () => {
  test('omits property when flag is absent', () => {
    expect(parsePackageIosArgv([])).toEqual({});
  });

  test('bare flag is shorthand for true (preset)', () => {
    expect(
      parsePackageIosArgv(['--use-prebuilt-rn-core']).usePrebuiltRnCore
    ).toBe(true);
  });

  test('explicit true and false', () => {
    expect(
      parsePackageIosArgv(['--use-prebuilt-rn-core', 'true']).usePrebuiltRnCore
    ).toBe(true);
    expect(
      parsePackageIosArgv(['--use-prebuilt-rn-core', 'false']).usePrebuiltRnCore
    ).toBe(false);
  });
});

describe('resolveNavigationIosSourceRoot', () => {
  test('returns undefined when outputDir is absent', () => {
    expect(resolveNavigationIosSourceRoot('/tmp/project')).toBeUndefined();
  });

  test('resolves outputDir relative to project root and appends ios', () => {
    expect(
      resolveNavigationIosSourceRoot('/tmp/project', '.brownfield/navigation')
    ).toBe(path.join('/tmp/project', '.brownfield', 'navigation', 'ios'));
  });
});

describe('withNavigationIosSourceRootEnv', () => {
  test('sets and restores env var around execution', async () => {
    const tempProjectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'brownfield-ios-env-test-')
    );
    const outputDir = '.brownfield/navigation';
    const iosSourceRoot = path.join(tempProjectRoot, outputDir, 'ios');
    fs.mkdirSync(iosSourceRoot, { recursive: true });
    delete process.env[BROWNFIELD_NAVIGATION_IOS_SOURCE_ROOT_ENV_VAR];

    const seenInside = await withNavigationIosSourceRootEnv({
      projectRoot: tempProjectRoot,
      outputDir,
      run: async () => process.env[BROWNFIELD_NAVIGATION_IOS_SOURCE_ROOT_ENV_VAR],
    });

    expect(seenInside).toBe(iosSourceRoot);
    expect(
      process.env[BROWNFIELD_NAVIGATION_IOS_SOURCE_ROOT_ENV_VAR]
    ).toBeUndefined();
  });

  test('throws when custom output does not provide ios generated sources', async () => {
    const tempProjectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'brownfield-ios-env-test-')
    );

    await expect(
      withNavigationIosSourceRootEnv({
        projectRoot: tempProjectRoot,
        outputDir: '.brownfield/missing-navigation-output',
        run: async () => undefined,
      })
    ).rejects.toThrow(rockTools.RockError);
  });
});
