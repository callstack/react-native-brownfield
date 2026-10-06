import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  collectFrameworkPaths,
  hasFrameworkBuildProduct,
  resolveDestinationSdks,
} from '../destinationSdks.js';

describe('resolveDestinationSdks', () => {
  it('builds both slices when no destination is passed', () => {
    expect(resolveDestinationSdks(undefined)).toEqual([
      'iphoneos',
      'iphonesimulator',
    ]);
    expect(resolveDestinationSdks([])).toEqual([
      'iphoneos',
      'iphonesimulator',
    ]);
  });

  it('maps the device and simulator aliases', () => {
    expect(resolveDestinationSdks(['simulator'])).toEqual(['iphonesimulator']);
    expect(resolveDestinationSdks(['device'])).toEqual(['iphoneos']);
  });

  it('maps raw xcodebuild destinations', () => {
    expect(resolveDestinationSdks(['generic/platform=iOS Simulator'])).toEqual([
      'iphonesimulator',
    ]);
    expect(resolveDestinationSdks(['generic/platform=iOS'])).toEqual([
      'iphoneos',
    ]);
  });

  it('widens to both slices for destinations it cannot classify', () => {
    expect(resolveDestinationSdks(['id=00008030-ABCDEF'])).toEqual([
      'iphoneos',
      'iphonesimulator',
    ]);
  });

  it('dedupes and keeps a stable order', () => {
    expect(resolveDestinationSdks(['simulator', 'device', 'simulator'])).toEqual(
      ['iphoneos', 'iphonesimulator']
    );
  });
});

describe('collectFrameworkPaths', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'destination-sdks-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createFramework(sdk: string, subDir?: string, name = 'BrownfieldLib') {
    const frameworkPath = path.join(
      tempDir,
      `Release-${sdk}`,
      ...(subDir ? [subDir] : []),
      `${name}.framework`
    );
    fs.mkdirSync(frameworkPath, { recursive: true });
    return frameworkPath;
  }

  it('returns only the slices that were built', () => {
    const simulatorFramework = createFramework('iphonesimulator');

    expect(
      collectFrameworkPaths({
        productsPath: tempDir,
        configuration: 'Release',
        sdks: ['iphonesimulator'],
        frameworkName: 'BrownfieldLib',
      })
    ).toEqual([simulatorFramework]);
  });

  it('drops slices with no build product on disk', () => {
    const simulatorFramework = createFramework('iphonesimulator');

    expect(
      collectFrameworkPaths({
        productsPath: tempDir,
        configuration: 'Release',
        sdks: ['iphoneos', 'iphonesimulator'],
        frameworkName: 'BrownfieldLib',
      })
    ).toEqual([simulatorFramework]);
  });

  it('accepts a static library as a build product', () => {
    const productsDir = path.join(tempDir, 'Release-iphonesimulator');
    fs.mkdirSync(productsDir, { recursive: true });
    fs.writeFileSync(path.join(productsDir, 'libBrownfieldLib.a'), 'archive');

    expect(hasFrameworkBuildProduct(productsDir, 'BrownfieldLib')).toBe(true);
    expect(
      collectFrameworkPaths({
        productsPath: tempDir,
        configuration: 'Release',
        sdks: ['iphonesimulator'],
        frameworkName: 'BrownfieldLib',
      })
    ).toEqual([path.join(productsDir, 'BrownfieldLib.framework')]);
  });

  it('throws a descriptive error when no slice has a build product', () => {
    fs.mkdirSync(path.join(tempDir, 'Debug-iphonesimulator'), {
      recursive: true,
    });

    expect(() =>
      collectFrameworkPaths({
        productsPath: tempDir,
        configuration: 'Debug',
        sdks: ['iphonesimulator'],
        frameworkName: 'mastodonreactnative',
      })
    ).toThrowError(/Could not find a build product for mastodonreactnative/);
  });

  it('resolves nested pod products', () => {
    const brownie = createFramework('iphonesimulator', 'Brownie', 'Brownie');

    expect(
      collectFrameworkPaths({
        productsPath: tempDir,
        configuration: 'Release',
        sdks: ['iphoneos', 'iphonesimulator'],
        frameworkName: 'Brownie',
        productSubDir: 'Brownie',
      })
    ).toEqual([brownie]);
  });
});
