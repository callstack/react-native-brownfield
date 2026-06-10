import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as rockTools from '@rock-js/tools';
import { Command } from 'commander';
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
  addBrownfieldConfig,
  loadBrownfieldConfig,
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

function createCommand(): Command {
  return new Command()
    .option('--scheme <scheme>')
    .option('--install-pods')
    .option('--destination <destination...>')
    .option('--target <target>')
    .option('--extra-params <extraParams...>');
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
        scheme: 'PackageScheme',
        destination: ['simulator'],
      },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      scheme: 'PackageScheme',
      destination: ['simulator'],
    });
  });

  it('loads config from a JavaScript config file', () => {
    tempDir = createTempProject({
      jsConfig: {
        scheme: 'JsScheme',
        installPods: true,
      },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      scheme: 'JsScheme',
      installPods: true,
    });
  });

  it('loads config from a JSON config file', () => {
    tempDir = createTempProject({
      jsonConfig: {
        scheme: 'JsonScheme',
        verbose: true,
      },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      scheme: 'JsonScheme',
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
        scheme: 'PackageScheme',
      },
      jsConfig: {
        scheme: 'JsScheme',
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
      scheme: 'AppScheme',
      destination: ['simulator'],
      usePrebuiltRnCore: true,
      verbose: true,
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

describe('addBrownfieldConfig', () => {
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

  it('applies config values to undefined CLI options', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        scheme: 'ConfigScheme',
        installPods: true,
        destination: ['simulator'],
      },
    });
    process.chdir(tempDir);

    const command = createCommand();
    command.setOptionValue('target', 'MyApp');

    addBrownfieldConfig(command);

    expect(command.optsWithGlobals()).toMatchObject({
      scheme: 'ConfigScheme',
      installPods: true,
      destination: ['simulator'],
      target: 'MyApp',
    });
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('warns and preserves the CLI value when it overrides the config', () => {
    tempDir = createTempProject({
      packageJsonConfig: {
        scheme: 'ConfigScheme',
      },
    });
    process.chdir(tempDir);

    const command = createCommand();
    command.setOptionValue('scheme', 'CliScheme');

    addBrownfieldConfig(command);

    expect(command.optsWithGlobals().scheme).toBe('CliScheme');
    expect(mockLoggerWarn).toHaveBeenCalled();
  });
});
