import { Command, Option } from 'commander';
import * as rockTools from '@rock-js/tools';
import { describe, expect, test } from 'vitest';

import {
  packageIosCommand,
  parseUsePrebuiltExpoArgument,
  parseUsePrebuiltRnCoreArgument,
} from '../packageIos.js';

/** Mirrors `--use-prebuilt-rn-core` on `packageIosCommand` (preset + parser). */
function parsePackageIosArgv(argv: string[]) {
  const program = new Command('package:ios')
    .addOption(
      new Option('--use-prebuilt-rn-core [bool]', 'test')
        .preset(true)
        .argParser(parseUsePrebuiltRnCoreArgument)
    )
    .addOption(
      new Option('--use-prebuilt-expo [bool]', 'test')
        .preset(true)
        .argParser(parseUsePrebuiltExpoArgument)
    )
    .addOption(new Option('--add-spm-package', 'test'));
  program.parse(argv, { from: 'user' });
  return program.opts() as {
    usePrebuiltRnCore?: boolean;
    usePrebuiltExpo?: boolean;
    addSpmPackage?: boolean;
  };
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

describe('--use-prebuilt-expo (Commander)', () => {
  test('omits property when flag is absent', () => {
    expect(parsePackageIosArgv([])).toEqual({});
  });

  test('bare flag is shorthand for true (preset)', () => {
    expect(parsePackageIosArgv(['--use-prebuilt-expo']).usePrebuiltExpo).toBe(
      true
    );
  });

  test('explicit true and false', () => {
    expect(
      parsePackageIosArgv(['--use-prebuilt-expo', 'true']).usePrebuiltExpo
    ).toBe(true);
    expect(
      parsePackageIosArgv(['--use-prebuilt-expo', 'false']).usePrebuiltExpo
    ).toBe(false);
  });
});

describe('--add-spm-package (Commander)', () => {
  test('package:ios exposes the add-spm-package option', () => {
    expect(
      packageIosCommand.options.some(
        (option) => option.long === '--add-spm-package'
      )
    ).toBe(true);
  });

  test('omits property when flag is absent', () => {
    expect(parsePackageIosArgv([]).addSpmPackage).toBeUndefined();
  });

  test('bare flag sets addSpmPackage to true', () => {
    expect(parsePackageIosArgv(['--add-spm-package']).addSpmPackage).toBe(
      true
    );
  });
});
