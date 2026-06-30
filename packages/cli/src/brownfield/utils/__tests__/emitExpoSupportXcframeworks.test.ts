import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as childProcess from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitExpoSupportXcframeworks } from '../emitExpoSupportXcframeworks.js';
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

describe('emitExpoSupportXcframeworks', () => {
  let tempDir: string;
  let projectRoot: string;
  let packageDir: string;
  let expoModulesJsiDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'emit-expo-support-xcframeworks-')
    );
    projectRoot = path.join(tempDir, 'project');
    packageDir = path.join(tempDir, 'package');
    expoModulesJsiDir = path.join(projectRoot, 'node_modules', 'expo-modules-jsi', 'apple', 'Products');
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

    createSignedMockXcframework(
      expoModulesJsiDir,
      'ExpoModulesJSI'
    );

    expect(
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toBe(true);

    const frameworkName = 'ExpoModulesJSI';
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

    expect(childProcess.execFileSync).toHaveBeenCalledTimes(6);
    expect(childProcess.execFileSync).toHaveBeenCalledWith(
      'codesign',
      [
        '--remove-signature',
        path.join(
          packageDir,
          'ExpoModulesJSI.xcframework',
          'ios-arm64_x86_64-simulator',
          'ExpoModulesJSI.framework',
          'ExpoModulesJSI'
        ),
      ],
      expect.objectContaining({ stdio: 'pipe' })
    );
  });

  it('fails clearly when an expected Expo SDK 56 XCFramework is missing', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);

    createSignedMockXcframework(
      expoModulesJsiDir,
      'ExpoModulesJSI'
    );

    expect(() =>
      emitExpoSupportXcframeworks({
        projectRoot,
        packageDir,
      })
    ).toThrow(
      'Expected Expo SDK 56+ XCFramework not found: ExpoModulesJSI.xcframework at node_modules/expo-modules-jsi/apple/Products/ExpoModulesJSI.xcframework'
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
