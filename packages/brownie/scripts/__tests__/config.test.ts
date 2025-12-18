import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config';

const FIXTURES_DIR = path.join(__dirname, '../__fixtures__');

const mockCwd = jest.spyOn(process, 'cwd');

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

  it('throws when brownie.stores config missing', () => {
    tempDir = createTempPackageJson({});
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow(
      'brownie.stores config not found in package.json'
    );
  });

  it('throws when stores is not an array', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: {
          schema: './test.schema.ts',
          typeName: 'TestStore',
          swift: './Test.swift',
        },
      },
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow('brownie.stores must be an array');
  });

  it('throws when stores array is empty', () => {
    tempDir = createTempPackageJson({
      brownie: { stores: [] },
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow('brownie.stores array cannot be empty');
  });

  it('throws when schema is missing', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [{ typeName: 'TestStore', swift: './Test.swift' }],
      },
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow('brownie.stores[0].schema is required');
  });

  it('throws when typeName is missing', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [{ schema: './test.schema.ts', swift: './Test.swift' }],
      },
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow(
      'brownie.stores[0].typeName is required'
    );
  });

  it('throws when no output path configured', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [{ schema: './test.schema.ts', typeName: 'TestStore' }],
      },
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow(
      'At least one output path is required: brownie.stores[0].swift or brownie.stores[0].kotlin'
    );
  });

  it('loads single store config', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './test.schema.ts',
            typeName: 'TestStore',
            swift: './Test.swift',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    const configs = loadConfig();
    expect(configs).toHaveLength(1);
    expect(configs[0]).toEqual({
      schema: './test.schema.ts',
      typeName: 'TestStore',
      swift: './Test.swift',
    });
  });

  it('loads multiple store configs', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './user.schema.ts',
            typeName: 'UserStore',
            swift: './UserStore.swift',
          },
          {
            schema: './settings.schema.ts',
            typeName: 'SettingsStore',
            kotlin: './SettingsStore.kt',
            kotlinPackageName: 'com.example',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    const configs = loadConfig();
    expect(configs).toHaveLength(2);
    expect(configs[0]!.typeName).toBe('UserStore');
    expect(configs[1]!.typeName).toBe('SettingsStore');
    expect(configs[1]!.kotlinPackageName).toBe('com.example');
  });

  it('validates each store in array', () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'ValidStore',
            swift: './Valid.swift',
          },
          {
            schema: './invalid.schema.ts',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);
    expect(() => loadConfig()).toThrow(
      'brownie.stores[1].typeName is required'
    );
  });
});
