import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../brownfield/utils/paths.js', () => ({
  findProjectRoot: vi.fn(() => process.cwd()),
}));

import { hasBrownfieldConfigFile } from '../config.js';
import {
  assertNoConfigFilePluginOverlap,
  resolveBrownfieldPluginConfig,
} from '../expoPluginConfig.js';

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
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'brownfield-expo-config-')
  );

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

const baseExpoConfig = {
  ios: {
    bundleIdentifier: 'com.example.app',
  },
  android: {
    package: 'com.example.app',
  },
};

describe('hasBrownfieldConfigFile', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('returns true when brownfield.config.json exists', () => {
    tempDir = createTempProject({
      jsonConfig: { verbose: true },
    });
    process.chdir(tempDir);

    expect(hasBrownfieldConfigFile()).toBe(true);
  });

  it('returns true when package.json contains a brownfield key', () => {
    tempDir = createTempProject({
      packageJsonConfig: {},
    });
    process.chdir(tempDir);

    expect(hasBrownfieldConfigFile()).toBe(true);
  });

  it('returns false when no brownfield config source exists', () => {
    tempDir = createTempProject();
    process.chdir(tempDir);

    expect(hasBrownfieldConfigFile()).toBe(false);
  });
});

describe('assertNoConfigFilePluginOverlap', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('allows empty plugin props when a config file exists', () => {
    tempDir = createTempProject({
      jsonConfig: { android: { moduleName: 'brownfieldlib' } },
    });
    process.chdir(tempDir);

    expect(() =>
      assertNoConfigFilePluginOverlap(
        { android: { moduleName: 'brownfieldlib' } },
        {}
      )
    ).not.toThrow();
  });

  it('throws when a config file exists and plugin props are non-empty', () => {
    tempDir = createTempProject({
      jsonConfig: { android: { moduleName: 'brownfieldlib' } },
    });
    process.chdir(tempDir);

    expect(() =>
      assertNoConfigFilePluginOverlap(
        { android: { moduleName: 'brownfieldlib' } },
        { android: { moduleName: 'brownfieldlib' } }
      )
    ).toThrow(/both a brownfield config file and app.json plugin options/);
  });

  it('throws when a config file exists and debug is set in plugin props', () => {
    tempDir = createTempProject({
      jsonConfig: { verbose: true },
    });
    process.chdir(tempDir);

    expect(() =>
      assertNoConfigFilePluginOverlap({ verbose: true }, { debug: true })
    ).toThrow(/both a brownfield config file and app.json plugin options/);
  });

  it('allows non-empty plugin props when no config file exists', () => {
    tempDir = createTempProject();
    process.chdir(tempDir);

    expect(() =>
      assertNoConfigFilePluginOverlap(
        {},
        { ios: { frameworkName: 'BrownfieldLib' } }
      )
    ).not.toThrow();
  });
});

describe('resolveBrownfieldPluginConfig', () => {
  let tempDir: string | null = null;

  beforeEach(() => {
    tempDir = createTempProject();
    process.chdir(tempDir);
  });

  afterEach(() => {
    if (tempDir) {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('resolves defaults from Expo config when no file config exists', () => {
    const resolved = resolveBrownfieldPluginConfig({}, {}, baseExpoConfig);

    expect(resolved).toEqual({
      debug: false,
      ios: {
        frameworkName: 'BrownfieldLib',
        bundleIdentifier: 'com.example.app.brownfield',
        buildSettings: {},
        deploymentTarget: '15.0',
        frameworkVersion: '1',
      },
      android: {
        moduleName: 'brownfieldlib',
        packageName: 'com.example.app',
        minSdkVersion: 24,
        targetSdkVersion: 35,
        compileSdkVersion: 35,
        groupId: 'com.example.app',
        artifactId: 'brownfieldlib',
        version: '0.0.1-SNAPSHOT',
      },
    });
  });

  it('uses legacy app.json plugin props when no config file exists', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {
        debug: true,
        ios: { frameworkName: 'CustomLib' },
        android: { moduleName: 'customlib' },
      },
      {},
      baseExpoConfig
    );

    expect(resolved.debug).toBe(true);
    expect(resolved.ios?.frameworkName).toBe('CustomLib');
    expect(resolved.android?.moduleName).toBe('customlib');
  });

  it('maps ios.scheme to frameworkName and verbose to debug from file config', () => {
    fs.writeFileSync(
      path.join(tempDir!, 'brownfield.config.json'),
      JSON.stringify({
        verbose: true,
        android: { moduleName: 'mylib' },
        ios: { scheme: 'MyLib' },
      })
    );

    const resolved = resolveBrownfieldPluginConfig(
      {},
      {
        verbose: true,
        android: { moduleName: 'mylib' },
        ios: { scheme: 'MyLib' },
      },
      baseExpoConfig
    );

    expect(resolved.debug).toBe(true);
    expect(resolved.ios?.frameworkName).toBe('MyLib');
    expect(resolved.android?.moduleName).toBe('mylib');
  });

  it('merges android.expo and ios.expo from file config', () => {
    fs.writeFileSync(
      path.join(tempDir!, 'brownfield.config.json'),
      JSON.stringify({
        android: {
          moduleName: 'mylib',
          expo: {
            minSdkVersion: 26,
            version: '2.0.0',
          },
        },
        ios: {
          scheme: 'MyLib',
          expo: {
            deploymentTarget: '16.0',
            bundleIdentifier: 'com.example.framework',
          },
        },
      })
    );

    const fileConfig = {
      android: {
        moduleName: 'mylib',
        expo: {
          minSdkVersion: 26,
          version: '2.0.0',
        },
      },
      ios: {
        scheme: 'MyLib',
        expo: {
          deploymentTarget: '16.0',
          bundleIdentifier: 'com.example.framework',
        },
      },
    };

    const resolved = resolveBrownfieldPluginConfig(
      {},
      fileConfig,
      baseExpoConfig
    );

    expect(resolved.android).toMatchObject({
      moduleName: 'mylib',
      minSdkVersion: 26,
      version: '2.0.0',
    });
    expect(resolved.ios).toMatchObject({
      frameworkName: 'MyLib',
      deploymentTarget: '16.0',
      bundleIdentifier: 'com.example.framework',
    });
  });
});
