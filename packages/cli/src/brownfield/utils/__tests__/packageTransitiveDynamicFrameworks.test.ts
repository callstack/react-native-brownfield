import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as childProcess from 'node:child_process';

import * as appleHelpers from '@rock-js/platform-apple-helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { packageTransitiveDynamicFrameworks } from '../packageTransitiveDynamicFrameworks.js';

vi.mock('@rock-js/platform-apple-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof appleHelpers>();
  return {
    ...actual,
    mergeFrameworks: vi.fn(),
  };
});

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

function createFramework(
  baseDir: string,
  frameworkName: string,
  platform: 'iphoneos' | 'iphonesimulator'
) {
  const frameworkDir = path.join(
    baseDir,
    `Release-${platform}`,
    frameworkName,
    `${frameworkName}.framework`
  );

  fs.mkdirSync(frameworkDir, { recursive: true });
  fs.writeFileSync(path.join(frameworkDir, frameworkName), 'binary');

  return frameworkDir;
}

describe('packageTransitiveDynamicFrameworks', () => {
  let tempDir: string;
  let packageDir: string;
  let productsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'package-transitive-dynamic-frameworks-')
    );
    packageDir = path.join(tempDir, 'package');
    productsPath = path.join(tempDir, 'products');

    fs.mkdirSync(packageDir, { recursive: true });
    fs.mkdirSync(productsPath, { recursive: true });
    fs.mkdirSync(path.join(packageDir, 'BrownfieldLib.xcframework'), {
      recursive: true,
    });

    createFramework(productsPath, 'BrownfieldLib', 'iphoneos');
    createFramework(productsPath, 'BrownfieldLib', 'iphonesimulator');
    createFramework(productsPath, 'ExpoAsset', 'iphoneos');
    createFramework(productsPath, 'ExpoAsset', 'iphonesimulator');

    vi.clearAllMocks();
    vi.mocked(childProcess.execFileSync).mockImplementation((command) => {
      if (command === 'otool') {
        return '/tmp/BrownfieldLib.framework/BrownfieldLib:\n';
      }

      if (command === 'xcrun') {
        return 'Architectures in the fat file: binary are: arm64 x86_64';
      }

      return '';
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('packages built frameworks that have both slices even when otool does not list them', async () => {
    await packageTransitiveDynamicFrameworks({
      configuration: 'Release',
      frameworkName: 'BrownfieldLib',
      packageDir,
      productsPath,
      sourceDir: '/repo/ios',
    });

    expect(appleHelpers.mergeFrameworks).toHaveBeenCalledWith({
      sourceDir: '/repo/ios',
      frameworkPaths: [
        path.join(
          productsPath,
          'Release-iphoneos',
          'ExpoAsset',
          'ExpoAsset.framework'
        ),
        path.join(
          productsPath,
          'Release-iphonesimulator',
          'ExpoAsset',
          'ExpoAsset.framework'
        ),
      ],
      outputPath: path.join(packageDir, 'ExpoAsset.xcframework'),
    });
  });

  it('falls back to raw-slice staging when xcodebuild cannot merge the framework', async () => {
    vi.mocked(appleHelpers.mergeFrameworks).mockRejectedValueOnce(
      new Error('missing swiftinterface')
    );

    await packageTransitiveDynamicFrameworks({
      configuration: 'Release',
      frameworkName: 'BrownfieldLib',
      packageDir,
      productsPath,
      sourceDir: '/repo/ios',
    });

    expect(
      fs.existsSync(
        path.join(
          packageDir,
          'ExpoAsset.xcframework',
          'ios-arm64_x86_64-simulator',
          'ExpoAsset.framework',
          'ExpoAsset'
        )
      )
    ).toBe(true);
    expect(
      fs.existsSync(path.join(packageDir, 'ExpoAsset.xcframework', 'Info.plist'))
    ).toBe(true);
  });
});
