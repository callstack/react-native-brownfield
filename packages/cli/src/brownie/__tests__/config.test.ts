import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isBrownieInstalled,
  loadConfig,
  getBrowniePackagePath,
  getSwiftOutputPath,
} from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../__fixtures__');

const mockCwd = vi.spyOn(process, 'cwd');

function createTempPackageJson(config: object): string {
  const tempDir = fs.mkdtempSync(path.join(FIXTURES_DIR, 'temp-'));
  const packageJsonPath = path.join(tempDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(config, null, 2));
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('loadConfig', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
    mockCwd.mockReset();
  });

  it('throws when package.json not found', () => {
    mockCwd.mockReturnValue('/nonexistent/path');
    expect(() => loadConfig()).toThrow('package.json not found');
  });

  it('returns empty config when brownie config missing', () => {
    tempDir = createTempPackageJson({});
    mockCwd.mockReturnValue(tempDir);
    const config = loadConfig();
    expect(config).toEqual({});
  });

  it('loads empty config', () => {
    tempDir = createTempPackageJson({
      brownie: {},
    });
    mockCwd.mockReturnValue(tempDir);

    const config = loadConfig();
    expect(config).toEqual({});
  });

  it('loads config with kotlin output', () => {
    tempDir = createTempPackageJson({
      brownie: {
        kotlin: './Generated',
        kotlinPackageName: 'com.example',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    const config = loadConfig();
    expect(config.kotlin).toBe('./Generated');
    expect(config.kotlinPackageName).toBe('com.example');
  });
});

describe('isBrownieInstalled', () => {
  it('returns false when brownie is not installed', () => {
    expect(isBrownieInstalled('/nonexistent/path')).toBe(false);
  });

  it('returns true when brownie is installed', () => {
    const rnAppPath = path.resolve(__dirname, '../../../../../apps/RNApp');
    expect(isBrownieInstalled(rnAppPath)).toBe(true);
  });
});

describe('getBrowniePackagePath', () => {
  it('resolves brownie package path from project with brownie dependency', () => {
    const rnAppPath = path.resolve(__dirname, '../../../../../apps/RNApp');
    const browniePath = getBrowniePackagePath(rnAppPath);
    expect(browniePath).toContain('brownie');
    expect(fs.existsSync(path.join(browniePath, 'package.json'))).toBe(true);
  });
});

describe('getSwiftOutputPath', () => {
  it('returns path to ios/Generated inside brownie package', () => {
    const rnAppPath = path.resolve(__dirname, '../../../../../apps/RNApp');
    const outputPath = getSwiftOutputPath(rnAppPath);
    expect(outputPath).toContain('brownie');
    expect(outputPath).toContain(path.join('ios', 'Generated'));
  });
});
