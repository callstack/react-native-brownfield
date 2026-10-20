import * as appleHelpers from '@rock-js/platform-apple-helpers';
import { packageIosAction } from '@rock-js/plugin-brownfield-ios';
import * as rockTools from '@rock-js/tools';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest';

import { packageIosCommand } from '../packageIos.js';
import { copyDebugBundleToSimulatorSlice } from '../../utils/copyDebugBundleToSimulatorSlice.js';
import { createLocalSpmPackage } from '../../utils/createLocalSpmPackage.js';
import { emitExpoSupportXcframeworks } from '../../utils/emitExpoSupportXcframeworks.js';
import { resolvePackagedFrameworkName } from '../../utils/resolvePackagedFrameworkName.js';
import { isExpoProject } from '../../utils/project.js';
import {
  isPrecompiledExpoDisabledByPodfile,
  supportsPrebuiltExpo,
} from '../../utils/supportsPrebuiltExpo.js';

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
      {
        name: '--extra-params <string>',
        description: 'test extra params option',
        parse: (value: string) => value.split(' '),
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

vi.mock('../../../config.js', () => ({
  mergeBrownfieldConfigWithOptions: vi.fn((options) => options),
}));

vi.mock('../../utils/expo.js', () => ({
  runExpoPrebuildIfNeeded: vi.fn(),
}));

vi.mock('../../utils/paths.js', () => ({
  findProjectRoot: vi.fn(() => '/repo'),
}));

vi.mock('../../utils/project.js', () => ({
  isExpoProject: vi.fn(() => false),
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
    enabledByDefault: true,
    reason: '',
  })),
}));

vi.mock('../../utils/supportsPrebuiltExpo.js', () => ({
  isPrecompiledExpoDisabledByPodfile: vi.fn(() => false),
  supportsPrebuiltExpo: vi.fn(() => ({
    supported: true,
    enabledByDefault: true,
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

vi.mock('../../utils/stripFrameworkBinary.js', () => ({
  stripFrameworkBinary: vi.fn(),
}));

vi.mock('../../utils/normalizeCopiedXcframework.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../utils/normalizeCopiedXcframework.js')
    >();
  return {
    ...actual,
    removeCodeSignatureArtifacts: vi.fn(),
  };
});

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
const mockSupportsPrebuiltExpo = supportsPrebuiltExpo as Mock;

const originalPrecompiledModules = process.env.EXPO_USE_PRECOMPILED_MODULES;

describe('package:ios action --add-spm-package', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EXPO_USE_PRECOMPILED_MODULES;
    (isExpoProject as Mock).mockReturnValue(false);
    (isPrecompiledExpoDisabledByPodfile as Mock).mockReturnValue(false);
    for (const option of ['usePrebuiltExpo', 'extraParams']) {
      packageIosCommand.setOptionValue(option, undefined);
    }

    mockResolvePackagedFrameworkName.mockReturnValue({
      frameworkName: 'BrownfieldLib',
      resolution: 'explicit',
      candidates: [],
    });
    mockSupportsPrebuiltExpo.mockReturnValue({
      supported: true,
      enabledByDefault: true,
      reason: '',
    });
    mockCreateLocalSpmPackage.mockReturnValue({
      packageManifestPath: '/repo/ios/.brownfield/package/build/Package.swift',
    });
    mockEmitExpoSupportXcframeworks.mockReturnValue(false);
  });

  afterEach(() => {
    if (originalPrecompiledModules === undefined) {
      delete process.env.EXPO_USE_PRECOMPILED_MODULES;
    } else {
      process.env.EXPO_USE_PRECOMPILED_MODULES = originalPrecompiledModules;
    }
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
      usePrebuiltExpo: true,
    });
    expect(mockLoggerSuccess).toHaveBeenCalledWith(
      'Local SPM package manifest created at /repo/ios/.brownfield/package/build/Package.swift'
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Add the local package folder in Xcode: /repo/ios/.brownfield/package/build'
    );
  });

  test('forwards explicit prebuilt Expo opt-out to Expo emission and SPM packaging', async () => {
    await invokePackageIosAction([
      '--add-spm-package',
      '--use-prebuilt-expo',
      'false',
      '--configuration',
      'Release',
    ]);

    expect(mockEmitExpoSupportXcframeworks).toHaveBeenCalledWith({
      projectRoot: '/repo',
      packageDir: '/repo/ios/.brownfield/package/build',
      usePrebuiltExpo: false,
    });
    expect(mockCreateLocalSpmPackage).toHaveBeenCalledWith({
      packageDir: '/repo/ios/.brownfield/package/build',
      frameworkName: 'BrownfieldLib',
      usePrebuiltExpo: false,
    });
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
      usePrebuiltExpo: true,
    });
    expect(
      mockEmitExpoSupportXcframeworks.mock.invocationCallOrder[0]
    ).toBeLessThan(mockCreateLocalSpmPackage.mock.invocationCallOrder[0] ?? 0);
  });

  test('turns on precompiled Expo modules and explicit modules when using prebuilt Expo', async () => {
    (isExpoProject as Mock).mockReturnValue(true);

    await invokePackageIosAction([
      '--use-prebuilt-expo',
      'true',
      '--configuration',
      'Release',
    ]);

    expect(process.env.EXPO_USE_PRECOMPILED_MODULES).toBe('1');
    expect(packageIosAction).toHaveBeenCalledWith(
      expect.objectContaining({
        extraParams: expect.arrayContaining([
          'SWIFT_ENABLE_EXPLICIT_MODULES=YES',
        ]),
      }),
      expect.anything(),
      expect.anything()
    );
  });

  test('turns off precompiled Expo modules when building Expo from source', async () => {
    (isExpoProject as Mock).mockReturnValue(true);

    await invokePackageIosAction([
      '--use-prebuilt-expo',
      'false',
      '--configuration',
      'Release',
    ]);

    expect(process.env.EXPO_USE_PRECOMPILED_MODULES).toBe('0');
  });
  test('builds Expo from source by default when the React Native version does not match', async () => {
    (isExpoProject as Mock).mockReturnValue(true);
    mockSupportsPrebuiltExpo.mockReturnValue({
      supported: true,
      enabledByDefault: false,
      defaultDisabledReason: 'Version mismatch.',
    });

    await invokePackageIosAction(['--configuration', 'Release']);

    expect(process.env.EXPO_USE_PRECOMPILED_MODULES).toBe('0');
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Version mismatch. Building Expo modules from source.'
    );
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  test('warns when prebuilt Expo is forced despite a React Native version mismatch', async () => {
    (isExpoProject as Mock).mockReturnValue(true);
    mockSupportsPrebuiltExpo.mockReturnValue({
      supported: true,
      enabledByDefault: false,
      defaultDisabledReason: 'Version mismatch.',
    });

    await invokePackageIosAction([
      '--use-prebuilt-expo',
      'true',
      '--configuration',
      'Release',
    ]);

    expect(process.env.EXPO_USE_PRECOMPILED_MODULES).toBe('1');
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Version mismatch. The packaged app will likely crash'
      )
    );
  });

  test('builds Expo from source when Podfile.properties.json turns precompiled modules off', async () => {
    (isExpoProject as Mock).mockReturnValue(true);
    (isPrecompiledExpoDisabledByPodfile as Mock).mockReturnValue(true);

    await invokePackageIosAction(['--configuration', 'Release']);

    expect(process.env.EXPO_USE_PRECOMPILED_MODULES).toBe('0');
    expect(mockEmitExpoSupportXcframeworks).toHaveBeenCalledWith(
      expect.objectContaining({ usePrebuiltExpo: false })
    );
  });

  test('warns when prebuilt Expo is forced but Podfile.properties.json turns it off', async () => {
    (isExpoProject as Mock).mockReturnValue(true);
    (isPrecompiledExpoDisabledByPodfile as Mock).mockReturnValue(true);

    await invokePackageIosAction([
      '--use-prebuilt-expo',
      'true',
      '--configuration',
      'Release',
    ]);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining(
        'ios/Podfile.properties.json sets EXPO_USE_PRECOMPILED_MODULES'
      )
    );
  });

  test('respects an exported EXPO_USE_PRECOMPILED_MODULES=0 when the flag is omitted', async () => {
    (isExpoProject as Mock).mockReturnValue(true);
    process.env.EXPO_USE_PRECOMPILED_MODULES = '0';

    await invokePackageIosAction(['--configuration', 'Release']);

    expect(process.env.EXPO_USE_PRECOMPILED_MODULES).toBe('0');
    expect(mockEmitExpoSupportXcframeworks).toHaveBeenCalledWith(
      expect.objectContaining({ usePrebuiltExpo: false })
    );
  });

  test('keeps a user-provided SWIFT_ENABLE_EXPLICIT_MODULES value', async () => {
    (isExpoProject as Mock).mockReturnValue(true);

    await invokePackageIosAction([
      '--use-prebuilt-expo',
      'true',
      '--extra-params',
      'SWIFT_ENABLE_EXPLICIT_MODULES=NO',
      '--configuration',
      'Release',
    ]);

    const [options] = (packageIosAction as Mock).mock.calls[0];
    expect(options.extraParams).toEqual(['SWIFT_ENABLE_EXPLICIT_MODULES=NO']);
  });
});
