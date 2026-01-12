import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { loadConfig } from '../config.js';

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

  it('throws when brownie config missing', () => {
    tempDir = createTempPackageJson({});
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow(
      'brownie config not found in package.json'
    );
  });

  it('throws when no output path configured', () => {
    tempDir = createTempPackageJson({
      brownie: {},
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow(
      'At least one output path is required: brownie.swift or brownie.kotlin'
    );
  });

  it('loads config with swift output', () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    const config = loadConfig();
    expect(config).toEqual({
      swift: './Generated',
    });
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

  it('loads config with all outputs', () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './swift/Generated',
        kotlin: './kotlin/Generated',
        kotlinPackageName: 'com.example',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    const config = loadConfig();
    expect(config.swift).toBe('./swift/Generated');
    expect(config.kotlin).toBe('./kotlin/Generated');
    expect(config.kotlinPackageName).toBe('com.example');
  });
});
