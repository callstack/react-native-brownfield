import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import * as rockTools from '@rock-js/tools';
import { runCodegen } from '../../commands/codegen.js';
import * as swiftGenerator from '../../generators/swift.js';
import * as kotlinGenerator from '../../generators/kotlin.js';
import * as storeDiscovery from '../../store-discovery.js';
import * as config from '../../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../../__fixtures__');

vi.mock('../../generators/swift');
vi.mock('../../generators/kotlin');
vi.mock('../../store-discovery');
vi.mock('../../config', async (importOriginal) => {
  const actual = await importOriginal<typeof config>();
  return {
    ...actual,
    getSwiftOutputPath: vi.fn(() => '/mock/brownie/ios/Generated'),
  };
});
vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();
  return {
    ...actual,
    logger: {
      ...actual.logger,
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    },
  };
});

const mockGenerateSwift = swiftGenerator.generateSwift as Mock;
const mockGenerateKotlin = kotlinGenerator.generateKotlin as Mock;
const mockDiscoverStores = storeDiscovery.discoverStores as Mock;
const mockCwd = vi.spyOn(process, 'cwd');
const mockLoggerError = rockTools.logger.error as Mock;
vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit(${code})`);
});

function createTempPackageJson(config: object): string {
  const tempDir = fs.mkdtempSync(path.join(FIXTURES_DIR, 'temp-'));
  const packageJsonPath = path.join(tempDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(config, null, 2));
  return tempDir;
}

function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('runCodegen', () => {
  let tempDir: string | null = null;

  beforeEach(() => {
    mockGenerateSwift.mockResolvedValue(undefined);
    mockGenerateKotlin.mockResolvedValue(undefined);
    mockDiscoverStores.mockReturnValue([
      { name: 'TestStore', schemaPath: '/path/to/TestStore.brownie.ts' },
    ]);
  });

  afterEach(() => {
    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
    vi.clearAllMocks();
  });

  it('generates swift files for discovered store', async () => {
    tempDir = createTempPackageJson({
      brownie: {},
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({});

    expect(mockGenerateSwift).toHaveBeenCalledWith({
      name: 'TestStore',
      schemaPath: '/path/to/TestStore.brownie.ts',
      typeName: 'TestStore',
      outputPath: '/mock/brownie/ios/Generated/TestStore.swift',
    });
    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('generates kotlin files when platform is kotlin', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        kotlin: './Generated',
        kotlinPackageName: 'com.test',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({ platform: 'kotlin' });

    expect(mockGenerateKotlin).toHaveBeenCalledWith({
      name: 'TestStore',
      schemaPath: '/path/to/TestStore.brownie.ts',
      typeName: 'TestStore',
      outputPath: 'Generated/TestStore.kt',
      packageName: 'com.test',
    });
    expect(mockGenerateSwift).not.toHaveBeenCalled();
  });

  it('generates only swift by default even when kotlin is configured', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        kotlin: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({});

    expect(mockGenerateSwift).toHaveBeenCalled();
    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('generates only specified platform', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        kotlin: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({ platform: 'swift' });

    expect(mockGenerateSwift).toHaveBeenCalled();
    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('generates for multiple discovered stores', async () => {
    tempDir = createTempPackageJson({
      brownie: {},
    });
    mockCwd.mockReturnValue(tempDir);

    mockDiscoverStores.mockReturnValue([
      { name: 'UserStore', schemaPath: '/path/to/UserStore.brownie.ts' },
      {
        name: 'SettingsStore',
        schemaPath: '/path/to/SettingsStore.brownie.ts',
      },
    ]);

    await runCodegen({});

    expect(mockGenerateSwift).toHaveBeenCalledTimes(2);
    expect(mockGenerateSwift).toHaveBeenNthCalledWith(1, {
      name: 'UserStore',
      schemaPath: '/path/to/UserStore.brownie.ts',
      typeName: 'UserStore',
      outputPath: '/mock/brownie/ios/Generated/UserStore.swift',
    });
    expect(mockGenerateSwift).toHaveBeenNthCalledWith(2, {
      name: 'SettingsStore',
      schemaPath: '/path/to/SettingsStore.brownie.ts',
      typeName: 'SettingsStore',
      outputPath: '/mock/brownie/ios/Generated/SettingsStore.swift',
    });
  });

  it('exits with error when generator fails', async () => {
    tempDir = createTempPackageJson({
      brownie: {},
    });
    mockCwd.mockReturnValue(tempDir);
    mockGenerateSwift.mockRejectedValue(new Error('Generation failed'));

    await expect(runCodegen({})).rejects.toThrow('process.exit(1)');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('skips kotlin when not configured', async () => {
    tempDir = createTempPackageJson({
      brownie: {},
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({ platform: 'kotlin' });

    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('works without brownie config in package.json', async () => {
    tempDir = createTempPackageJson({});
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({});

    expect(mockGenerateSwift).toHaveBeenCalled();
  });
});
