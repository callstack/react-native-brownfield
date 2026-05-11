import { describe, expect, it } from 'vitest';

import { getFrameworkBuildSettings } from '../xcodeHelpers';
import type { ResolvedBrownfieldPluginIosConfig } from '../../types';

const baseOptions: ResolvedBrownfieldPluginIosConfig = {
  frameworkName: 'BrownfieldLib',
  bundleIdentifier: 'com.example.brownfield',
  deploymentTarget: '15.0',
  frameworkVersion: '1',
  buildSettings: {},
};

describe('getFrameworkBuildSettings', () => {
  it('uses rpath-based install settings for generated framework targets', () => {
    const settings = getFrameworkBuildSettings(
      { configuration: 'Debug' },
      baseOptions
    );

    expect(settings.DYLIB_INSTALL_NAME_BASE).toBe('"@rpath"');
    expect(settings.INSTALL_PATH).toBe('"$(LOCAL_LIBRARY_DIR)/Frameworks"');
    expect(settings.SKIP_INSTALL).toBe('NO');
  });

  it('preserves custom build settings while keeping required framework settings', () => {
    const settings = getFrameworkBuildSettings(
      { configuration: 'Release' },
      {
        ...baseOptions,
        buildSettings: {
          SWIFT_VERSION: '5.10',
          MARKETING_VERSION: '9.9.9',
        },
      }
    );

    expect(settings.DYLIB_INSTALL_NAME_BASE).toBe('"@rpath"');
    expect(settings.INSTALL_PATH).toBe('"$(LOCAL_LIBRARY_DIR)/Frameworks"');
    expect(settings.SWIFT_VERSION).toBe('5.10');
    expect(settings.MARKETING_VERSION).toBe('9.9.9');
  });
});
