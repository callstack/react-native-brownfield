import * as rockTools from '@rock-js/tools';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as projectUtils from '../project.js';
import { assertUsePrebuiltRnCoreSupported } from '../usePrebuiltRnCore.js';

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

describe('assertUsePrebuiltRnCoreSupported', () => {
  beforeEach(() => {
    vi.mocked(rockTools.getReactNativeVersion).mockReset();
    vi.mocked(projectUtils.isExpoProject).mockReset();
    vi.mocked(projectUtils.getExpoSdkMajor).mockReset();
  });

  test('allows vanilla RN >= 0.81', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(() =>
      assertUsePrebuiltRnCoreSupported({ projectRoot: '/project' })
    ).not.toThrow();
  });

  test('rejects vanilla RN < 0.81', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.80.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(() =>
      assertUsePrebuiltRnCoreSupported({ projectRoot: '/project' })
    ).toThrow(rockTools.RockError);
    expect(() =>
      assertUsePrebuiltRnCoreSupported({ projectRoot: '/project' })
    ).toThrow(/React Native 0\.81\.0 or newer/);
  });

  test('rejects unknown react-native version', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('unknown');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(false);

    expect(() =>
      assertUsePrebuiltRnCoreSupported({ projectRoot: '/project' })
    ).toThrow(/unable to resolve the installed react-native version/);
  });

  test('allows Expo SDK >= 55 when RN is supported', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(55);

    expect(() =>
      assertUsePrebuiltRnCoreSupported({ projectRoot: '/project' })
    ).not.toThrow();
  });

  test('rejects Expo SDK < 55 even when RN is supported', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');
    vi.mocked(projectUtils.isExpoProject).mockReturnValue(true);
    vi.mocked(projectUtils.getExpoSdkMajor).mockReturnValue(54);

    expect(() =>
      assertUsePrebuiltRnCoreSupported({ projectRoot: '/project' })
    ).toThrow(/Expo SDK 55 or newer/);
  });
});
