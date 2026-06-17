import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as rockTools from '@rock-js/tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();
  return {
    ...actual,
    logger: {
      ...actual.logger,
      warn: vi.fn(),
      debug: vi.fn(),
      setVerbose: vi.fn(),
    },
  };
});

vi.mock('../brownfield/utils/paths.js', () => ({
  findProjectRoot: vi.fn(() => process.cwd()),
}));

import {
  loadBrownfieldConfig,
  mergeBrownfieldConfigWithOptions,
  validateBrownfieldCLIConfig,
} from '../config.js';

const mockLoggerWarn = rockTools.logger.warn as ReturnType<typeof vi.fn>;
const originalCwd = process.cwd();

function createTempProject({
  packageJsonConfig,
  jsConfig,
  jsonConfig,
}: {
  packageJsonConfig?: Record<string, unknown>;
  jsConfig?: Record<string, unknown>;
  jsonConfig?: Record<string, unknown>;
} = {}): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brownfield-config-'));

  const packageJson: Record<string, unknown> = {
    name: 'temp-project',
    version: '1.0.0',
  };

  if (packageJsonConfig !== undefined) {
    packageJson['brownfield'] = packageJsonConfig;
  }

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  if (jsConfig !== undefined) {
    fs.writeFileSync(
      path.join(tempDir, 'brownfield.config.js'),
      `module.exports = ${JSON.stringify(jsConfig, null, 2)};\n`
    );
  }

  if (jsonConfig !== undefined) {
    fs.writeFileSync(
      path.join(tempDir, 'brownfield.config.json'),
      JSON.stringify(jsonConfig, null, 2)
    );
  }

  return tempDir;
}

describe('loadBrownfieldConfig', () => {
  let tempDir: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);

    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('loads config from package.json', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        ios: {
          scheme: 'PackageScheme',
          destination: ['simulator'],
        },
      },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      ios: {
        scheme: 'PackageScheme',
        destination: ['simulator'],
      },
    });
  });

  it('loads config from a JavaScript config file', () => {
    tempDir = createTempProject({
      jsConfig: {
        ios: {
          scheme: 'JsScheme',
          installPods: true,
        },
      },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      ios: {
        scheme: 'JsScheme',
        installPods: true,
      },
    });
  });

  it('loads config from a JSON config file', () => {
    tempDir = createTempProject({
      jsonConfig: {
        ios: {
          scheme: 'JsonScheme',
        },
        verbose: true,
      },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      ios: {
        scheme: 'JsonScheme',
      },
      verbose: true,
    });
  });

  it('returns an empty config when no source exists', () => {
    tempDir = createTempProject();

    expect(loadBrownfieldConfig(tempDir)).toEqual({});
  });

  it('throws when multiple config sources are present', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        ios: {
          scheme: 'PackageScheme',
        },
      },
      jsConfig: {
        ios: {
          scheme: 'JsScheme',
        },
      },
    });

    expect(() => loadBrownfieldConfig(tempDir!)).toThrow(
      'Project has multiple Brownfield configuration files'
    );
  });
});

describe('validateBrownfieldCLIConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not warn for a schema-valid config', () => {
    validateBrownfieldCLIConfig({
      verbose: true,
      ios: {
        scheme: 'AppScheme',
        destination: ['simulator'],
        usePrebuiltRnCore: true,
      },
      brownie: {
        kotlin:
          './android/BrownfieldLib/src/main/java/com/rnapp/brownfieldlib/Generated/',
        kotlinPackageName: 'com.rnapp.brownfieldlib',
      },
    });

    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('warns for a schema-invalid config', () => {
    validateBrownfieldCLIConfig({
      unsupportedOption: true,
    });

    expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn.mock.calls[0]?.[0]).toContain(
      'Brownfield configuration has some issues:'
    );
  });
});

describe('mergeBrownfieldConfigWithOptions', () => {
  let tempDir: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);

    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('applies platform config values to undefined CLI options', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        ios: {
          scheme: 'ConfigScheme',
          installPods: true,
          destination: ['simulator'],
        },
      },
    });
    process.chdir(tempDir);

    const options = {
      target: 'MyApp',
      scheme: undefined,
    };

    const mergedOptions = mergeBrownfieldConfigWithOptions(options, 'ios');

    expect(mergedOptions).toMatchObject({
      scheme: 'ConfigScheme',
      installPods: true,
      destination: ['simulator'],
      target: 'MyApp',
    });
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('preserves CLI options when they override platform config', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        ios: {
          scheme: 'ConfigScheme',
        },
      },
    });
    process.chdir(tempDir);

    const options = {
      scheme: 'CliScheme',
    };

    const mergedOptions = mergeBrownfieldConfigWithOptions(options, 'ios');

    expect(mergedOptions.scheme).toBe('CliScheme');
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'CLI option "%s" is overriding the react-native-brownfield config value: %s -> %s.',
      'scheme',
      'ConfigScheme',
      'CliScheme'
    );
  });

  it('logs array config values overridden by CLI options', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        ios: {
          destination: ['simulator'],
        },
      },
    });
    process.chdir(tempDir);

    mergeBrownfieldConfigWithOptions(
      {
        destination: ['device'],
      },
      'ios'
    );

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'CLI option "%s" is overriding the react-native-brownfield config value: %s -> %s.',
      'destination',
      '["simulator"]',
      '["device"]'
    );
  });

  it('does not allow undefined options to override platform config', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        android: {
          variant: 'release',
        },
      },
    });
    process.chdir(tempDir);

    const options = {
      variant: undefined,
    };

    const mergedOptions = mergeBrownfieldConfigWithOptions(options, 'android');

    expect(mergedOptions.variant).toBe('release');
  });

  it('applies shared config values to platform commands', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        verbose: true,
        android: {
          moduleName: ':BrownfieldLib',
        },
      },
    });
    process.chdir(tempDir);

    const options = {};

    const mergedOptions = mergeBrownfieldConfigWithOptions(options, 'android');

    expect(mergedOptions).toMatchObject({
      verbose: true,
      moduleName: ':BrownfieldLib',
    });
  });
});
