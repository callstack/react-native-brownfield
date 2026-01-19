import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import * as rockTools from '@rock-js/tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stripFrameworkBinary } from '../stripFrameworkBinary.js';

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
      debug: vi.fn(),
    },
  };
});

const mockLoggerWarn = rockTools.logger.warn as ReturnType<typeof vi.fn>;
const mockLoggerSuccess = rockTools.logger.success as ReturnType<typeof vi.fn>;

function createMockXcframework(
  baseDir: string,
  name: string,
  slices: string[]
): string {
  const xcframeworkPath = path.join(baseDir, `${name}.xcframework`);
  fs.mkdirSync(xcframeworkPath, { recursive: true });

  for (const slice of slices) {
    const frameworkDir = path.join(xcframeworkPath, slice, `${name}.framework`);
    fs.mkdirSync(frameworkDir, { recursive: true });

    const binaryPath = path.join(frameworkDir, name);
    fs.writeFileSync(binaryPath, 'fake binary content for testing');
  }

  return xcframeworkPath;
}

describe('stripFrameworkBinary', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-framework-test-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws when xcframework does not exist', () => {
    const nonExistentPath = path.join(tempDir, 'NonExistent.xcframework');

    expect(() => stripFrameworkBinary(nonExistentPath)).toThrow(
      'XCFramework not found at:'
    );
  });

  it('strips binary from ios-arm64 slice', () => {
    const xcframeworkPath = createMockXcframework(tempDir, 'TestFramework', [
      'ios-arm64',
    ]);
    const binaryPath = path.join(
      xcframeworkPath,
      'ios-arm64',
      'TestFramework.framework',
      'TestFramework'
    );
    const originalContent = fs.readFileSync(binaryPath, 'utf-8');

    stripFrameworkBinary(xcframeworkPath);

    const newContent = fs.readFileSync(binaryPath);
    expect(newContent.toString()).not.toBe(originalContent);
    expect(fs.existsSync(binaryPath)).toBe(true);
    expect(mockLoggerSuccess).toHaveBeenCalledWith(
      'TestFramework.xcframework is now interface-only'
    );
  });

  it('strips binary from simulator slice with fat binary', () => {
    const xcframeworkPath = createMockXcframework(tempDir, 'TestFramework', [
      'ios-arm64_x86_64-simulator',
    ]);
    const binaryPath = path.join(
      xcframeworkPath,
      'ios-arm64_x86_64-simulator',
      'TestFramework.framework',
      'TestFramework'
    );
    const originalContent = fs.readFileSync(binaryPath, 'utf-8');

    stripFrameworkBinary(xcframeworkPath);

    const newContent = fs.readFileSync(binaryPath);
    expect(newContent.toString()).not.toBe(originalContent);

    const archInfo = execSync(`xcrun lipo -info "${binaryPath}"`, {
      encoding: 'utf-8',
    });
    expect(archInfo).toContain('arm64');
    expect(archInfo).toContain('x86_64');
  });

  it('handles multiple slices', () => {
    const xcframeworkPath = createMockXcframework(tempDir, 'TestFramework', [
      'ios-arm64',
      'ios-arm64_x86_64-simulator',
    ]);

    stripFrameworkBinary(xcframeworkPath);

    const deviceBinary = path.join(
      xcframeworkPath,
      'ios-arm64',
      'TestFramework.framework',
      'TestFramework'
    );
    const simBinary = path.join(
      xcframeworkPath,
      'ios-arm64_x86_64-simulator',
      'TestFramework.framework',
      'TestFramework'
    );

    expect(fs.existsSync(deviceBinary)).toBe(true);
    expect(fs.existsSync(simBinary)).toBe(true);
    expect(mockLoggerSuccess).toHaveBeenCalledOnce();
  });

  it('warns and skips unknown slice types', () => {
    const xcframeworkPath = createMockXcframework(tempDir, 'TestFramework', [
      'ios-unknown-slice',
    ]);

    stripFrameworkBinary(xcframeworkPath);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Unknown slice type: ios-unknown-slice, skipping'
    );
  });

  it('warns and skips slices without binary', () => {
    const xcframeworkPath = path.join(tempDir, 'TestFramework.xcframework');
    const frameworkDir = path.join(
      xcframeworkPath,
      'ios-arm64',
      'TestFramework.framework'
    );
    fs.mkdirSync(frameworkDir, { recursive: true });

    stripFrameworkBinary(xcframeworkPath);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('No binary found at')
    );
  });

  it('ignores non-ios directories', () => {
    const xcframeworkPath = createMockXcframework(tempDir, 'TestFramework', [
      'ios-arm64',
    ]);
    fs.mkdirSync(path.join(xcframeworkPath, 'macos-arm64'), {
      recursive: true,
    });

    stripFrameworkBinary(xcframeworkPath);

    expect(mockLoggerSuccess).toHaveBeenCalledOnce();
  });
});
