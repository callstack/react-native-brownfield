import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as rockTools from '@rock-js/tools';
import { Command } from 'commander';
import { afterEach, describe, expect, it, Mock, vi } from 'vitest';

import {
  applyBrownfieldCLIConfig,
  loadAndApplyBrownfieldCLIConfig,
  loadBrownfieldConfig,
  validateBrownfieldCLIConfig,
} from '../config.js';

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();

  return {
    ...actual,
    logger: {
      ...actual.logger,
      debug: vi.fn(),
      warn: vi.fn(),
    },
  };
});

const mockLoggerWarn = rockTools.logger.warn as Mock;

function createTempProject(options?: {
  packageJsonConfig?: Record<string, unknown>;
  jsConfig?: Record<string, unknown>;
  jsonConfig?: Record<string, unknown>;
}): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brownfield-cli-config-'));

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(
      {
        name: 'brownfield-config-test',
        version: '1.0.0',
        'react-native-brownfield': options?.packageJsonConfig,
      },
      null,
      2
    )
  );

  if (options?.jsConfig) {
    fs.writeFileSync(
      path.join(tempDir, 'react-native-brownfield.config.js'),
      `module.exports = ${JSON.stringify(options.jsConfig, null, 2)};\n`
    );
  }

  if (options?.jsonConfig) {
    fs.writeFileSync(
      path.join(tempDir, 'react-native-brownfield.config.json'),
      JSON.stringify(options.jsonConfig, null, 2)
    );
  }

  return tempDir;
}

function cleanupTempDir(directory: string): void {
  fs.rmSync(directory, { recursive: true, force: true });
}

describe('loadBrownfieldConfig', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    mockLoggerWarn.mockReset();

    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
  });

  it('prefers js config over json and package.json', () => {
    tempDir = createTempProject({
      packageJsonConfig: { verbose: false, variant: 'package-json' },
      jsonConfig: { verbose: false, variant: 'json' },
      jsConfig: { verbose: true, variant: 'js' },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      verbose: true,
      variant: 'js',
    });
  });

  it('prefers json config over package.json when js config is missing', () => {
    tempDir = createTempProject({
      packageJsonConfig: { verbose: false, variant: 'package-json' },
      jsonConfig: { verbose: true, variant: 'json' },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      verbose: true,
      variant: 'json',
    });
  });

  it('falls back to package.json config when js and json configs are missing', () => {
    tempDir = createTempProject({
      packageJsonConfig: { verbose: true, variant: 'package-json' },
    });

    expect(loadBrownfieldConfig(tempDir)).toEqual({
      verbose: true,
      variant: 'package-json',
    });
  });
});

describe('validateBrownfieldCLIConfig', () => {
  afterEach(() => {
    mockLoggerWarn.mockReset();
  });

  it('does not warn for valid config', () => {
    validateBrownfieldCLIConfig({
      verbose: true,
      variant: 'release',
    });

    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('warns for schema violations', () => {
    validateBrownfieldCLIConfig({
      unsupportedOption: true,
    });

    expect(mockLoggerWarn).toHaveBeenCalledOnce();
    expect(mockLoggerWarn.mock.calls[0]?.[0]).toContain(
      'Brownfield configuration has some issues:'
    );
    expect(mockLoggerWarn.mock.calls[0]?.[0]).toContain(
      'should NOT have additional properties'
    );
  });
});

describe('config application', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    mockLoggerWarn.mockReset();

    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
  });

  it('applies config values to a commander program with config as the source', () => {
    const program = new Command();

    applyBrownfieldCLIConfig(program, {
      verbose: true,
      variant: 'release',
    });

    expect(program.getOptionValue('verbose')).toBe(true);
    expect(program.getOptionValueSource('verbose')).toBe('config');
    expect(program.getOptionValue('variant')).toBe('release');
    expect(program.getOptionValueSource('variant')).toBe('config');
  });

  it('loads config and attaches it to the commander program', () => {
    tempDir = createTempProject({
      packageJsonConfig: { verbose: true, variant: 'release' },
    });

    const program = new Command();

    loadAndApplyBrownfieldCLIConfig(program, tempDir);

    expect(program.getOptionValue('verbose')).toBe(true);
    expect(program.getOptionValueSource('verbose')).toBe('config');
    expect(program.getOptionValue('variant')).toBe('release');
    expect(program.getOptionValueSource('variant')).toBe('config');
  });
});