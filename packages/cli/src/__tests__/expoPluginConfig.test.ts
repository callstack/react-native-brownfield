import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../brownfield/utils/paths.js', () => ({
  findProjectRoot: vi.fn(() => process.cwd()),
}));

import { loadBrownfieldConfig } from '../config.js';
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

describe('loadBrownfieldConfig', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('returns config when brownfield.config.json exists', () => {
    tempDir = createTempProject({
      jsonConfig: { verbose: true },
    });
    process.chdir(tempDir);

    expect(loadBrownfieldConfig()).toEqual({ verbose: true });
  });

  it('returns config when package.json contains a brownfield key', () => {
    tempDir = createTempProject({
      packageJsonConfig: {},
    });
    process.chdir(tempDir);

    expect(loadBrownfieldConfig()).toEqual({});
  });

  it('returns null when no brownfield config source exists', () => {
    tempDir = createTempProject();
    process.chdir(tempDir);

    expect(loadBrownfieldConfig()).toBeNull();
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
      assertNoConfigFilePluginOverlap(null, {
        ios: { frameworkName: 'BrownfieldLib' },
      })
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
    const resolved = resolveBrownfieldPluginConfig({}, null, baseExpoConfig);

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
        useLocalGradlePlugin: false,
        minifyEnabled: false,
        extraProguardRules: [],
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
      null,
      baseExpoConfig
    );

    expect(resolved.debug).toBe(true);
    expect(resolved.ios?.frameworkName).toBe('CustomLib');
    expect(resolved.android?.moduleName).toBe('customlib');
  });

  it('strips leading ":" from android.moduleName when resolving from file config', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {},
      { android: { moduleName: ':mylib' } },
      baseExpoConfig
    );
    expect(resolved.android?.moduleName).toBe('mylib');
    expect(resolved.android?.artifactId).toBe('mylib');
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
      minifyEnabled: false,
      extraProguardRules: [],
    });
    expect(resolved.ios).toMatchObject({
      frameworkName: 'MyLib',
      deploymentTarget: '16.0',
      bundleIdentifier: 'com.example.framework',
    });
  });

  it('maps android.expo.useLocalGradlePlugin from file config', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {},
      {
        android: {
          moduleName: 'mylib',
          expo: {
            useLocalGradlePlugin: true,
          },
        },
      },
      baseExpoConfig
    );

    expect(resolved.android?.useLocalGradlePlugin).toBe(true);
  });

  it('maps android.expo.minifyEnabled and extraProguardRules from file config', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {},
      {
        android: {
          moduleName: 'mylib',
          expo: {
            minifyEnabled: true,
            extraProguardRules: [
              '-keep class com.example.Foo { *; }',
              '-dontwarn com.example.Bar',
            ],
          },
        },
      },
      baseExpoConfig
    );

    expect(resolved.android?.minifyEnabled).toBe(true);
    expect(resolved.android?.extraProguardRules).toEqual([
      '-keep class com.example.Foo { *; }',
      '-dontwarn com.example.Bar',
    ]);
  });

  it('drops empty android.expo.extraProguardRules entries', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {},
      {
        android: {
          moduleName: 'mylib',
          expo: {
            extraProguardRules: [
              '   ',
              '-keep class com.example.Foo { *; }',
              '',
              '  -dontwarn com.example.Bar  ',
            ],
          },
        },
      },
      baseExpoConfig
    );

    expect(resolved.android?.extraProguardRules).toEqual([
      '-keep class com.example.Foo { *; }',
      '  -dontwarn com.example.Bar  ',
    ]);
  });

  it('maps android.useLocalGradlePlugin from legacy app.json plugin props', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {
        android: {
          moduleName: 'mylib',
          useLocalGradlePlugin: true,
        },
      },
      null,
      baseExpoConfig
    );

    expect(resolved.android?.useLocalGradlePlugin).toBe(true);
  });

  it('maps android minifyEnabled and extraProguardRules from legacy app.json plugin props', () => {
    const resolved = resolveBrownfieldPluginConfig(
      {
        android: {
          moduleName: 'mylib',
          minifyEnabled: true,
          extraProguardRules: [
            '-keep class com.example.Legacy { *; }',
            '-dontwarn com.example.Legacy',
          ],
        },
      },
      null,
      baseExpoConfig
    );

    expect(resolved.android?.minifyEnabled).toBe(true);
    expect(resolved.android?.extraProguardRules).toEqual([
      '-keep class com.example.Legacy { *; }',
      '-dontwarn com.example.Legacy',
    ]);
  });
});
