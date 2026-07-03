import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as projectUtils from '../project.js';
import { supportsPrebuiltExpo } from '../supportsPrebuiltExpo.js';

vi.mock('../project.js', async (importOriginal) => {
  const actual = await importOriginal<typeof projectUtils>();
  return {
    ...actual,
    getExpoSdkMajor: vi.fn(),
    isExpoProject: vi.fn(),
  };
});

describe('supportsPrebuiltExpo', () => {
  beforeEach(() => {
    vi.mocked(projectUtils.isExpoProject).mockReset();
    vi.mocked(projectUtils.getExpoSdkMajor).mockReset();
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
});
