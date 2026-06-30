import * as appleHelpers from '@rock-js/platform-apple-helpers';
import { packageIosAction } from '@rock-js/plugin-brownfield-ios';
import * as rockTools from '@rock-js/tools';

import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { runBrownieCodegenIfApplicable } from '../../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { packageIosCommand } from '../packageIos.js';
import { copyDebugBundleToSimulatorSlice } from '../../utils/copyDebugBundleToSimulatorSlice.js';
import { createLocalSpmPackage } from '../../utils/createLocalSpmPackage.js';
import { emitExpoSupportXcframeworks } from '../../utils/emitExpoSupportXcframeworks.js';
import { runExpoPrebuildIfNeeded } from '../../utils/expo.js';
import { getProjectInfo } from '../../utils/project.js';
import { resolvePackagedFrameworkName } from '../../utils/resolvePackagedFrameworkName.js';
import { supportsPrebuiltRNCore } from '../../utils/supportsPrebuiltRNCore.js';

vi.mock('@rock-js/platform-apple-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof appleHelpers>();
  return {
    ...actual,
    getBuildOptions: vi.fn(() => [
      {
        name: '--configuration <configuration>',
        description: 'test configuration option',
      },
      {
        name: '--scheme <scheme>',
        description: 'test scheme option',
      },
    ]),
    mergeFrameworks: vi.fn(),
  };
});

vi.mock('@rock-js/plugin-brownfield-ios', () => ({
  packageIosAction: vi.fn(),
}));

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();
  return {
    ...actual,
    colorLink: vi.fn((value: string) => value),
    getReactNativeVersion: vi.fn(() => '0.84.0'),
    relativeToCwd: vi.fn((value: string) => value),
    logger: {
      ...actual.logger,
      error: vi.fn(),
      info: vi.fn(),
      isVerbose: vi.fn(() => false),
      success: vi.fn(),
      warn: vi.fn(),
    },
  };
});

vi.mock('../../utils/expo.js', () => ({
  runExpoPrebuildIfNeeded: vi.fn(),
}));

vi.mock('../../utils/project.js', () => ({
  getProjectInfo: vi.fn(() => ({
    projectRoot: '/repo',
    platformConfig: {},
    userConfig: {
      reactNativePath: '/repo/node_modules/react-native',
      project: {
        ios: {
          sourceDir: 'ios',
          xcodeProject: {
            name: 'RNApp.xcodeproj',
          },
        },
      },
    },
  })),
}));

vi.mock('../../utils/supportsPrebuiltRNCore.js', () => ({
  supportsPrebuiltRNCore: vi.fn(() => ({
    supported: true,
    enabledByDefault: false,
    reason: '',
  })),
}));

vi.mock('../../../brownie/helpers/runBrownieCodegenIfApplicable.js', () => ({
  runBrownieCodegenIfApplicable: vi.fn(async () => ({
    hasBrownie: false,
  })),
}));

vi.mock(
  '../../../navigation/helpers/runNavigationCodegenIfApplicable.js',
  () => ({
    runNavigationCodegenIfApplicable: vi.fn(async () => ({
      hasNavigation: false,
    })),
  })
);

vi.mock('../../utils/copyDebugBundleToSimulatorSlice.js', () => ({
  copyDebugBundleToSimulatorSlice: vi.fn(),
}));

vi.mock('../../utils/resolvePackagedFrameworkName.js', () => ({
  resolvePackagedFrameworkName: vi.fn(() => ({
    frameworkName: 'BrownfieldLib',
    resolution: 'explicit',
    candidates: [],
  })),
}));

vi.mock('../../utils/createLocalSpmPackage.js', () => ({
  createLocalSpmPackage: vi.fn(() => ({
    packageManifestPath: '/repo/ios/.brownfield/package/build/Package.swift',
  })),
}));

vi.mock('../../utils/emitExpoSupportXcframeworks.js', () => ({
  emitExpoSupportXcframeworks: vi.fn(() => false),
}));

vi.mock('../../utils/copyBundledXcframeworks.js', () => ({
  copyBundledXcframeworks: vi.fn(),
}));

vi.mock('../../utils/packageReactBrownfieldXcframework.js', () => ({
  packageSupportModuleXcframework: vi.fn(),
}));

vi.mock('../../utils/packageTransitiveDynamicFrameworks.js', () => ({
  packageTransitiveDynamicFrameworks: vi.fn(),
}));

vi.mock('../../utils/stripFrameworkBinary.js', () => ({
  stripFrameworkBinary: vi.fn(),
}));

vi.mock('../../utils/stripPackagedCodeSignatures.js', () => ({
  stripPackagedCodeSignatures: vi.fn(),
}));

const invokePackageIosAction = async (argv: string[]) => {
  await packageIosCommand.parseAsync(argv, { from: 'user' });
};

// @ts-expect-error - override typings
const processExitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
  // no-op
});

const mockLoggerError = rockTools.logger.error as Mock;
const mockLoggerInfo = rockTools.logger.info as Mock;
const mockLoggerSuccess = rockTools.logger.success as Mock;
const mockLoggerWarn = rockTools.logger.warn as Mock;
const mockCreateLocalSpmPackage = createLocalSpmPackage as Mock;
const mockEmitExpoSupportXcframeworks = emitExpoSupportXcframeworks as Mock;
const mockResolvePackagedFrameworkName = resolvePackagedFrameworkName as Mock;

describe('package:ios action --add-spm-package', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockResolvePackagedFrameworkName.mockReturnValue({
      frameworkName: 'BrownfieldLib',
      resolution: 'explicit',
      candidates: [],
    });
    mockCreateLocalSpmPackage.mockReturnValue({
      packageManifestPath: '/repo/ios/.brownfield/package/build/Package.swift',
    });
    mockEmitExpoSupportXcframeworks.mockReturnValue(false);
  });

  test('calls createLocalSpmPackage with the resolved framework name', async () => {
    await invokePackageIosAction([
      '--add-spm-package',
      '--configuration',
      'Release',
    ]);

    expect(packageIosAction).toHaveBeenCalledOnce();
    expect(copyDebugBundleToSimulatorSlice).toHaveBeenCalledWith({
      productsPath: '/repo/ios/.brownfield/build/Build/Products',
      configuration: 'Release',
      frameworkName: 'BrownfieldLib',
    });
    expect(mockCreateLocalSpmPackage).toHaveBeenCalledWith({
      packageDir: '/repo/ios/.brownfield/package/build',
      frameworkName: 'BrownfieldLib',
    });
    expect(mockLoggerSuccess).toHaveBeenCalledWith(
      'Local SPM package manifest created at /repo/ios/.brownfield/package/build/Package.swift'
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Add the local package folder in Xcode: /repo/ios/.brownfield/package/build'
    );
  });

  test('fails fast when Release packaging cannot resolve the framework name and SPM output was requested', async () => {
    mockResolvePackagedFrameworkName.mockReturnValue({
      frameworkName: null,
      resolution: 'not_found',
      candidates: [],
    });

    await invokePackageIosAction([
      '--add-spm-package',
      '--configuration',
      'Release',
    ]);

    expect(mockCreateLocalSpmPackage).not.toHaveBeenCalled();
    expect(mockLoggerWarn).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Cannot generate local SPM package: could not resolve the packaged framework output automatically; pass --scheme explicitly'
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  test('fails fast when Debug packaging cannot resolve the framework name and SPM output was requested', async () => {
    mockResolvePackagedFrameworkName.mockReturnValue({
      frameworkName: null,
      resolution: 'ambiguous',
      candidates: ['AppOne', 'AppTwo'],
    });

    await invokePackageIosAction([
      '--add-spm-package',
      '--configuration',
      'Debug',
    ]);

    expect(mockCreateLocalSpmPackage).not.toHaveBeenCalled();
    expect(mockLoggerWarn).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Cannot generate local SPM package: found multiple bundled framework candidates (AppOne, AppTwo); pass --scheme explicitly'
    );
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  test('runs Expo framework emission before local SPM package creation for Expo SDK 56+', async () => {
    mockEmitExpoSupportXcframeworks.mockReturnValue(true);

    await invokePackageIosAction([
      '--add-spm-package',
      '--configuration',
      'Release',
    ]);

    expect(mockEmitExpoSupportXcframeworks).toHaveBeenCalledWith({
      projectRoot: '/repo',
      packageDir: '/repo/ios/.brownfield/package/build',
    });
    expect(
      mockEmitExpoSupportXcframeworks.mock.invocationCallOrder[0]
    ).toBeLessThan(mockCreateLocalSpmPackage.mock.invocationCallOrder[0] ?? 0);
  });
});
