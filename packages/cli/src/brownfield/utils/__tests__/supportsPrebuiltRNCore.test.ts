import * as rockTools from '@rock-js/tools';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as projectUtils from '../project.js';
import { supportsPrebuiltRNCore } from '../supportsPrebuiltRNCore.js';

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();
  return {
    ...actual,
    getReactNativeVersion: vi.fn(),
  };
});

vi.mock('../project.js', async (importOriginal) => {
  const actual = await importOriginal<typeof projectUtils>();
  return {
    ...actual,
    getExpoSdkMajor: vi.fn(),
    isExpoProject: vi.fn(),
  };
});

describe('supportsPrebuiltRNCore', () => {
  beforeEach(() => {
    vi.mocked(rockTools.getReactNativeVersion).mockReset();
    vi.mocked(projectUtils.isExpoProject).mockReset();
    vi.mocked(projectUtils.getExpoSdkMajor).mockReset();
  });

  test('returns supported with opt-in default for vanilla RN 0.83', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(supportsPrebuiltRNCore({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: false,
    });
  });

  test('returns supported with default enabled for vanilla RN >= 0.84', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.84.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(supportsPrebuiltRNCore({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: true,
    });
  });

  test('returns unsupported for vanilla RN < 0.81', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.80.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    const result = supportsPrebuiltRNCore({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(/React Native 0\.81\.0 or newer/),
    });
  });

  test('returns unsupported for unknown react-native version', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('unknown');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    const result = supportsPrebuiltRNCore({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(
        /unable to resolve the installed react-native version/
      ),
    });
  });

  test('returns supported with default enabled for Expo SDK >= 55', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(55);

    expect(supportsPrebuiltRNCore({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: true,
    });
  });

  test('returns unsupported for Expo SDK < 55 even when RN is supported', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(54);

    const result = supportsPrebuiltRNCore({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(/Expo SDK 54.*requires Expo SDK 55 or newer/),
    });
  });
});
