import * as rockTools from '@rock-js/tools';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { supportsPrebuiltRNCore } from '../supportsPrebuiltRNCore.js';

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();
  return {
    ...actual,
    getReactNativeVersion: vi.fn(),
  };
});

describe('supportsPrebuiltRNCore', () => {
  beforeEach(() => {
    vi.mocked(rockTools.getReactNativeVersion).mockReset();
  });

  test('returns supported with opt-in default for vanilla RN 0.83', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.83.0');

    expect(supportsPrebuiltRNCore({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: false,
    });
  });

  test('returns supported with default enabled for vanilla RN >= 0.84', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.84.0');

    expect(supportsPrebuiltRNCore({ projectRoot: '/project' })).toEqual({
      supported: true,
      enabledByDefault: true,
    });
  });

  test('returns unsupported for vanilla RN < 0.81', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('0.80.0');

    const result = supportsPrebuiltRNCore({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(/React Native 0\.81\.0 or newer/),
    });
  });

  test('returns unsupported for unknown react-native version', () => {
    vi.mocked(rockTools.getReactNativeVersion).mockReturnValue('unknown');

    const result = supportsPrebuiltRNCore({ projectRoot: '/project' });

    expect(result).toEqual({
      supported: false,
      reason: expect.stringMatching(
        /unable to resolve the installed react-native version/
      ),
    });
  });

});
