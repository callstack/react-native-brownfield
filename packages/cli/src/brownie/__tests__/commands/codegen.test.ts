import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { runCodegen } from '../../commands/codegen.js';
import * as swiftGenerator from '../../generators/swift.js';
import * as kotlinGenerator from '../../generators/kotlin.js';
import * as storeDiscovery from '../../store-discovery.js';
import * as rockTools from '@rock-js/tools';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '../../__fixtures__');

vi.mock('../../generators/swift');
vi.mock('../../generators/kotlin');
vi.mock('../../store-discovery');
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
      brownie: {
        swift: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({});

    expect(mockGenerateSwift).toHaveBeenCalledWith({
      name: 'TestStore',
      schemaPath: '/path/to/TestStore.brownie.ts',
      typeName: 'TestStore',
      outputPath: 'Generated/TestStore.swift',
    });
    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('generates kotlin files for discovered store', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        kotlin: './Generated',
        kotlinPackageName: 'com.test',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({});

    expect(mockGenerateKotlin).toHaveBeenCalledWith({
      name: 'TestStore',
      schemaPath: '/path/to/TestStore.brownie.ts',
      typeName: 'TestStore',
      outputPath: 'Generated/TestStore.kt',
      packageName: 'com.test',
    });
    expect(mockGenerateSwift).not.toHaveBeenCalled();
  });

  it('generates both swift and kotlin when configured', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './Generated',
        kotlin: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({});

    expect(mockGenerateSwift).toHaveBeenCalled();
    expect(mockGenerateKotlin).toHaveBeenCalled();
  });

  it('generates only specified platform', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './Generated',
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
      brownie: {
        swift: './Generated',
      },
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
      outputPath: 'Generated/UserStore.swift',
    });
    expect(mockGenerateSwift).toHaveBeenNthCalledWith(2, {
      name: 'SettingsStore',
      schemaPath: '/path/to/SettingsStore.brownie.ts',
      typeName: 'SettingsStore',
      outputPath: 'Generated/SettingsStore.swift',
    });
  });

  it('exits with error for invalid platform', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    // @ts-expect-error - testing invalid input
    await expect(runCodegen({ platform: 'invalid' })).rejects.toThrow(
      'process.exit(1)'
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('exits with error when generator fails', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);
    mockGenerateSwift.mockRejectedValue(new Error('Generation failed'));

    await expect(runCodegen({})).rejects.toThrow('process.exit(1)');
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('warns when store has no output paths for selected platform', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        swift: './Generated',
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen({ platform: 'kotlin' });

    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });
});
