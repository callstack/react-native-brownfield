import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as projectUtils from '../project.js';
import {
  isPrecompiledExpoDisabledByPodfile,
  supportsPrebuiltExpo,
} from '../supportsPrebuiltExpo.js';

vi.mock('../project.js', async (importOriginal) => {
  const actual = await importOriginal<typeof projectUtils>();
  return {
    ...actual,
    getExpoSdkMajor: vi.fn(),
    getExpoIosUsePrecompiledModules: vi.fn(),
    isExpoProject: vi.fn(),
  };
});

describe('supportsPrebuiltExpo', () => {
  beforeEach(() => {
    vi.mocked(projectUtils.isExpoProject).mockReset();
    vi.mocked(projectUtils.getExpoSdkMajor).mockReset();
    vi.mocked(projectUtils.getExpoIosUsePrecompiledModules).mockReset();
  });

  test('returns supported with opt-in default for non-Expo projects', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(supportsPrebuiltExpo({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: false,
    });
  });

  test('returns supported with default enabled for Expo SDK >= 56', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);

    expect(supportsPrebuiltExpo({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: true,
    });
  });

  test('returns unsupported for Expo SDK < 56', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(55);

    const result = supportsPrebuiltExpo({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(/Expo SDK 56 or newer/),
    });
  });

  test('returns unsupported when Expo SDK cannot be resolved', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(null);

    const result = supportsPrebuiltExpo({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(/Expo SDK unknown/),
    });
  });

  describe('React Native version', () => {
    let projectRoot: string;

    function writePackage(name: string, files: Record<string, unknown>) {
      const dir = path.join(projectRoot, 'node_modules', name);
      fs.mkdirSync(dir, { recursive: true });
      for (const [file, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, file), JSON.stringify(content));
      }
    }

    function createProject(expoReactNative: string, appReactNative: string) {
      projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'brownfield-expo-'));
      fs.writeFileSync(
        path.join(projectRoot, 'package.json'),
        JSON.stringify({ name: 'app' })
      );
      writePackage('expo', {
        'package.json': { name: 'expo', version: '58.0.0' },
        'bundledNativeModules.json': { 'react-native': expoReactNative },
      });
      writePackage('react-native', {
        'package.json': { name: 'react-native', version: appReactNative },
        'index.js': 'module.exports = {};',
      });
    }

    beforeEach(() => {
      vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
      vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(58);
    });

    afterEach(() => {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    test('keeps prebuilts on when only the patch or prerelease differs', () => {
      createProject('0.88.0-rc.4', '0.88.0-rc.1');

      expect(supportsPrebuiltExpo({ projectRoot })).toEqual({
        supported: true,
        enabledByDefault: true,
      });
    });

    test('turns prebuilts off by default for another React Native minor', () => {
      createProject('0.88.0-rc.4', '0.87.0');

      expect(supportsPrebuiltExpo({ projectRoot })).toEqual({
        supported: true,
        enabledByDefault: false,
        defaultDisabledReason: expect.stringMatching(
          /built for React Native 0\.88, but this project uses 0\.87\.0/
        ),
      });
    });
  });
});

describe('isPrecompiledExpoDisabledByPodfile', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'podfile-properties-'));
    fs.mkdirSync(path.join(projectRoot, 'ios'));
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  function writeProperties(content: string) {
    fs.writeFileSync(
      path.join(projectRoot, 'ios', 'Podfile.properties.json'),
      content
    );
  }

  test('returns true when the property is the string "false"', () => {
    writeProperties('{"EXPO_USE_PRECOMPILED_MODULES": "false"}');

    expect(isPrecompiledExpoDisabledByPodfile(projectRoot)).toBe(true);
  });

  test('returns false when the property is "true"', () => {
    writeProperties('{"EXPO_USE_PRECOMPILED_MODULES": "true"}');

    expect(isPrecompiledExpoDisabledByPodfile(projectRoot)).toBe(false);
  });

  test('returns false when the file is missing or invalid', () => {
    expect(isPrecompiledExpoDisabledByPodfile(projectRoot)).toBe(false);

    writeProperties('not json');

    expect(isPrecompiledExpoDisabledByPodfile(projectRoot)).toBe(false);
  });

  test('returns unsupported when ios.usePrecompiledModules is false', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);
    vi.mocked(projectUtils.getExpoIosUsePrecompiledModules).mockReturnValue(
      false
    );

    expect(supportsPrebuiltExpo({ projectRoot: '/project' })).toEqual({
      supported: false,
      reason: expect.stringMatching(/ios\.usePrecompiledModules/),
    });
  });

  test('stays supported when ios.usePrecompiledModules is true or unset', () => {
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(56);

    for (const value of [true, undefined]) {
      vi.mocked(projectUtils.getExpoIosUsePrecompiledModules).mockReturnValue(
        value
      );
      expect(supportsPrebuiltExpo({ projectRoot: '/project' })).toEqual({
        supported: true,
        enabledByDefault: true,
      });
    }
  });
});
