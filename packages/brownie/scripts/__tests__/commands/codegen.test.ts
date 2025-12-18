import fs from 'fs';
import path from 'path';
import { runCodegen } from '../../commands/codegen';
import * as swiftGenerator from '../../generators/swift';
import * as kotlinGenerator from '../../generators/kotlin';

const FIXTURES_DIR = path.join(__dirname, '../../__fixtures__');

jest.mock('../../generators/swift');
jest.mock('../../generators/kotlin');

const mockGenerateSwift = swiftGenerator.generateSwift as jest.Mock;
const mockGenerateKotlin = kotlinGenerator.generateKotlin as jest.Mock;
const mockCwd = jest.spyOn(process, 'cwd');
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
jest.spyOn(console, 'warn').mockImplementation();
jest.spyOn(process, 'exit').mockImplementation((code) => {
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
  });

  afterEach(() => {
    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
    jest.clearAllMocks();
  });

  it('prints version when -v flag passed', async () => {
    await runCodegen(['-v'], '1.0.0');
    expect(mockConsoleLog).toHaveBeenCalledWith('1.0.0');
  });

  it('prints help when -h flag passed', async () => {
    await runCodegen(['-h'], '1.0.0');
    expect(mockConsoleLog).toHaveBeenCalled();
    const output = mockConsoleLog.mock.calls[0]![0];
    expect(output).toContain('brownie codegen');
  });

  it('generates swift files for single store', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            swift: './Generated/TestStore.swift',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen([], '1.0.0');

    expect(mockGenerateSwift).toHaveBeenCalledWith({
      schemaPath: './valid.schema.ts',
      typeName: 'TestStore',
      outputPath: './Generated/TestStore.swift',
    });
    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('generates kotlin files for single store', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            kotlin: './Generated/TestStore.kt',
            kotlinPackageName: 'com.test',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen([], '1.0.0');

    expect(mockGenerateKotlin).toHaveBeenCalledWith({
      schemaPath: './valid.schema.ts',
      typeName: 'TestStore',
      outputPath: './Generated/TestStore.kt',
      packageName: 'com.test',
    });
    expect(mockGenerateSwift).not.toHaveBeenCalled();
  });

  it('generates both swift and kotlin when configured', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            swift: './Generated/TestStore.swift',
            kotlin: './Generated/TestStore.kt',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen([], '1.0.0');

    expect(mockGenerateSwift).toHaveBeenCalled();
    expect(mockGenerateKotlin).toHaveBeenCalled();
  });

  it('generates only specified platform with -p flag', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            swift: './Generated/TestStore.swift',
            kotlin: './Generated/TestStore.kt',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen(['-p', 'swift'], '1.0.0');

    expect(mockGenerateSwift).toHaveBeenCalled();
    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });

  it('generates for multiple stores', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './user.schema.ts',
            typeName: 'UserStore',
            swift: './Generated/UserStore.swift',
          },
          {
            schema: './settings.schema.ts',
            typeName: 'SettingsStore',
            swift: './Generated/SettingsStore.swift',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen([], '1.0.0');

    expect(mockGenerateSwift).toHaveBeenCalledTimes(2);
    expect(mockGenerateSwift).toHaveBeenNthCalledWith(1, {
      schemaPath: './user.schema.ts',
      typeName: 'UserStore',
      outputPath: './Generated/UserStore.swift',
    });
    expect(mockGenerateSwift).toHaveBeenNthCalledWith(2, {
      schemaPath: './settings.schema.ts',
      typeName: 'SettingsStore',
      outputPath: './Generated/SettingsStore.swift',
    });
  });

  it('exits with error for invalid platform', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            swift: './Generated/TestStore.swift',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await expect(runCodegen(['-p', 'invalid'], '1.0.0')).rejects.toThrow(
      'process.exit(1)'
    );
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('exits with error when generator fails', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            swift: './Generated/TestStore.swift',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);
    mockGenerateSwift.mockRejectedValue(new Error('Generation failed'));

    await expect(runCodegen([], '1.0.0')).rejects.toThrow('process.exit(1)');
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('warns when store has no output paths for selected platform', async () => {
    tempDir = createTempPackageJson({
      brownie: {
        stores: [
          {
            schema: './valid.schema.ts',
            typeName: 'TestStore',
            swift: './Generated/TestStore.swift',
          },
        ],
      },
    });
    mockCwd.mockReturnValue(tempDir);

    await runCodegen(['-p', 'kotlin'], '1.0.0');

    expect(mockGenerateKotlin).not.toHaveBeenCalled();
  });
});
