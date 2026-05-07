import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as rockTools from '@rock-js/tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyDebugBundleToSimulatorSlice } from '../copyDebugBundleToSimulatorSlice.js';

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

function createFramework(pathname: string) {
  fs.mkdirSync(pathname, { recursive: true });
  fs.writeFileSync(path.join(pathname, 'BrownfieldLib'), 'fake binary');
}

describe('copyDebugBundleToSimulatorSlice', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-debug-bundle-test-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('copies main.jsbundle into the Debug simulator slice when it is missing', () => {
    const productsPath = path.join(tempDir, 'Build', 'Products');

    const deviceFrameworkPath = path.join(
      productsPath,
      'Debug-iphoneos',
      'BrownfieldLib.framework'
    );
    const simulatorFrameworkPath = path.join(
      productsPath,
      'Debug-iphonesimulator',
      'BrownfieldLib.framework'
    );

    createFramework(deviceFrameworkPath);
    createFramework(simulatorFrameworkPath);

    fs.writeFileSync(
      path.join(deviceFrameworkPath, 'main.jsbundle'),
      'debug bundled output'
    );

    copyDebugBundleToSimulatorSlice({
      productsPath,
      configuration: 'Debug',
      frameworkName: 'BrownfieldLib',
    });

    const simulatorBundlePath = path.join(
      simulatorFrameworkPath,
      'main.jsbundle'
    );

    expect(fs.readFileSync(simulatorBundlePath, 'utf8')).toBe(
      'debug bundled output'
    );
    expect(mockLoggerSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Copied Debug JS bundle to simulator slice')
    );
  });

  it('does nothing for non-Debug configurations', () => {
    const productsPath = path.join(tempDir, 'Build', 'Products');

    const deviceFrameworkPath = path.join(
      productsPath,
      'Release-iphoneos',
      'BrownfieldLib.framework'
    );
    const simulatorFrameworkPath = path.join(
      productsPath,
      'Release-iphonesimulator',
      'BrownfieldLib.framework'
    );

    createFramework(deviceFrameworkPath);
    createFramework(simulatorFrameworkPath);
    fs.writeFileSync(
      path.join(deviceFrameworkPath, 'main.jsbundle'),
      'release bundle'
    );

    copyDebugBundleToSimulatorSlice({
      productsPath,
      configuration: 'Release',
      frameworkName: 'BrownfieldLib',
    });

    expect(
      fs.existsSync(path.join(simulatorFrameworkPath, 'main.jsbundle'))
    ).toBe(false);
    expect(mockLoggerSuccess).not.toHaveBeenCalled();
  });

  it('warns and skips when the device bundle is missing', () => {
    const productsPath = path.join(tempDir, 'Build', 'Products');

    const simulatorFrameworkPath = path.join(
      productsPath,
      'Debug-iphonesimulator',
      'BrownfieldLib.framework'
    );

    createFramework(simulatorFrameworkPath);

    copyDebugBundleToSimulatorSlice({
      productsPath,
      configuration: 'Debug',
      frameworkName: 'BrownfieldLib',
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('Skipping simulator JS bundle copy')
    );
  });

  it('overwrites an existing simulator bundle with the Debug device bundle', () => {
    const productsPath = path.join(tempDir, 'Build', 'Products');

    const deviceFrameworkPath = path.join(
      productsPath,
      'Debug-iphoneos',
      'BrownfieldLib.framework'
    );
    const simulatorFrameworkPath = path.join(
      productsPath,
      'Debug-iphonesimulator',
      'BrownfieldLib.framework'
    );

    createFramework(deviceFrameworkPath);
    createFramework(simulatorFrameworkPath);

    fs.writeFileSync(
      path.join(deviceFrameworkPath, 'main.jsbundle'),
      'fresh debug bundle'
    );
    fs.writeFileSync(
      path.join(simulatorFrameworkPath, 'main.jsbundle'),
      'stale simulator bundle'
    );

    copyDebugBundleToSimulatorSlice({
      productsPath,
      configuration: 'Debug',
      frameworkName: 'BrownfieldLib',
    });

    expect(
      fs.readFileSync(path.join(simulatorFrameworkPath, 'main.jsbundle'), 'utf8')
    ).toBe('fresh debug bundle');
  });
});
