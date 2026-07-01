import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as childProcess from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ALL_EXPO_SUPPORT_XCFRAMEWORK_NAMES,
  emitExpoSupportXcframeworks,
} from '../emitExpoSupportXcframeworks.js';
import * as projectUtils from '../project.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

vi.mock('../project.js', async (importOriginal) => {
  const actual = await importOriginal<typeof projectUtils>();
  return {
    ...actual,
    getExpoSdkMajor: vi.fn(),
    isExpoProject: vi.fn(),
  };
});

function createSignedMockXcframework(rootDir: string, name: string) {
  const frameworkDir = path.join(
    rootDir,
    `${name}.xcframework`,
    'ios-arm64_x86_64-simulator',
    `${name}.framework`
  );
  fs.mkdirSync(path.join(frameworkDir, '_CodeSignature'), { recursive: true });
  fs.writeFileSync(path.join(frameworkDir, name), 'mock-binary');
  fs.writeFileSync(
    path.join(frameworkDir, '_CodeSignature', 'CodeResources'),
    'signature'
  );
}

function createAllRequiredExpoSupportXcframeworks(projectRoot: string) {
  for (const frameworkName of ALL_EXPO_SUPPORT_XCFRAMEWORK_NAMES) {
    const parentDir =
      frameworkName === 'ExpoModulesJSI'
        ? path.join(
            projectRoot,
            'node_modules',
            'expo-modules-jsi',
            'apple',
            'Products'
          )
        : [
              'SDWebImage',
              'SDWebImageSVGCoder',
              'SDWebImageWebPCoder',
              'SDWebImageAVIFCoder',
              'libavif',
            ].includes(frameworkName)
          ? path.join(projectRoot, 'ios', 'Pods', 'ExpoImage')
          : path.join(projectRoot, 'ios', 'Pods', frameworkName);

    createSignedMockXcframework(parentDir, frameworkName);
  }
}

describe('emitExpoSupportXcframeworks', () => {
  let tempDir: string;
  let projectRoot: string;
  let packageDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'emit-expo-support-xcframeworks-')
    );
    projectRoot = path.join(tempDir, 'project');
    packageDir = path.join(tempDir, 'package');
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.mkdirSync(packageDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves and copies Expo SDK 56 support XCFrameworks from the expected sources', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);

    createAllRequiredExpoSupportXcframeworks(projectRoot);

    expect(
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toBe(true);

    for (const frameworkName of ALL_EXPO_SUPPORT_XCFRAMEWORK_NAMES) {
      const copiedFrameworkDir = path.join(
        packageDir,
        `${frameworkName}.xcframework`,
        'ios-arm64_x86_64-simulator',
        `${frameworkName}.framework`
      );

      expect(fs.existsSync(path.join(copiedFrameworkDir, frameworkName))).toBe(
        true
      );
      expect(
        fs.existsSync(
          path.join(copiedFrameworkDir, '_CodeSignature', 'CodeResources')
        )
      ).toBe(false);

      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'codesign',
        [
          '--remove-signature',
          path.join(
            packageDir,
            `${frameworkName}.xcframework`,
            'ios-arm64_x86_64-simulator',
            `${frameworkName}.framework`,
            frameworkName
          ),
        ],
        expect.objectContaining({ stdio: 'pipe' })
      );
    }

    expect(childProcess.execFileSync).toHaveBeenCalled();
  });

  it('fails clearly when ExpoFileSystem.xcframework is missing from Pods', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);

    createAllRequiredExpoSupportXcframeworks(projectRoot);
    fs.rmSync(
      path.join(
        projectRoot,
        'ios',
        'Pods',
        'ExpoFileSystem',
        'ExpoFileSystem.xcframework'
      ),
      { recursive: true, force: true }
    );

    expect(() =>
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toThrow(
      'Expected Expo SDK 56+ XCFramework not found: ExpoFileSystem.xcframework at ios/Pods/ExpoFileSystem/ExpoFileSystem.xcframework'
    );
  });

  it('fails clearly when ExpoFont.xcframework is missing from Pods', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);

    createAllRequiredExpoSupportXcframeworks(projectRoot);
    fs.rmSync(
      path.join(projectRoot, 'ios', 'Pods', 'ExpoFont', 'ExpoFont.xcframework'),
      { recursive: true, force: true }
    );

    expect(() =>
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toThrow(
      'Expected Expo SDK 56+ XCFramework not found: ExpoFont.xcframework at ios/Pods/ExpoFont/ExpoFont.xcframework'
    );
  });

  it('skips emission for non-Expo projects and Expo SDK < 56', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toBe(false);

    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(55);

    expect(
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toBe(false);

    expect(fs.readdirSync(packageDir)).toEqual([]);
    expect(childProcess.execFileSync).not.toHaveBeenCalled();
  });
});
