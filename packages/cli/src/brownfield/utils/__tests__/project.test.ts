import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  getExpoConfigIfIsExpo,
  getExpoIosUsePrecompiledModules,
} from '../project.js';

function createTempExpoProject(): string {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'brownfield-expo-project-')
  );

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(
      {
        name: 'temp-expo-project',
        version: '1.0.0',
        dependencies: {
          expo: '58.0.0',
        },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(tempDir, 'app.json'),
    JSON.stringify(
      {
        expo: {
          name: 'TempExpoProject',
          slug: 'temp-expo-project',
          android: {
            package: 'com.example.tempexpo',
          },
          plugins: ['broken-esm-plugin'],
        },
      },
      null,
      2
    )
  );

  const pluginDir = path.join(tempDir, 'node_modules', 'broken-esm-plugin');
  fs.mkdirSync(path.join(pluginDir, 'build'), { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, 'package.json'),
    JSON.stringify(
      {
        name: 'broken-esm-plugin',
        version: '1.0.0',
        type: 'module',
        main: 'build/index.js',
        exports: {
          '.': './build/index.js',
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(pluginDir, 'build', 'index.js'),
    "import { init } from './observe';\ninit();\nexport default {};\n"
  );
  fs.writeFileSync(
    path.join(pluginDir, 'build', 'observe.js'),
    'export function init() {}\n'
  );

  return tempDir;
}

describe('getExpoConfigIfIsExpo', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('does not evaluate Expo config plugins when reading project metadata', () => {
    tempDir = createTempExpoProject();

    expect(() => getExpoConfigIfIsExpo(tempDir as string)).not.toThrow();
    expect(getExpoConfigIfIsExpo(tempDir as string)?.exp.android?.package).toBe(
      'com.example.tempexpo'
    );
  });
});

function createDynamicConfigExpoProject(usePrecompiledModules: boolean): string {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'brownfield-expo-dynamic-')
  );

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify(
      { name: 'temp-dynamic-expo', version: '1.0.0', dependencies: { expo: '58.0.0' } },
      null,
      2
    )
  );

  // Dynamic config only: no app.json, so `rootConfig` carries no plugins array.
  fs.writeFileSync(
    path.join(tempDir, 'app.config.js'),
    `module.exports = {
  name: 'TempDynamicExpo',
  slug: 'temp-dynamic-expo',
  plugins: [['expo-build-properties', { ios: { usePrecompiledModules: ${usePrecompiledModules} } }]],
};
`
  );

  // Resolvable no-op plugin so plugin evaluation succeeds.
  const pluginDir = path.join(tempDir, 'node_modules', 'expo-build-properties');
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, 'package.json'),
    JSON.stringify(
      { name: 'expo-build-properties', version: '1.0.0', main: 'index.js' },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(pluginDir, 'index.js'),
    'module.exports = (config) => config;\n'
  );

  return tempDir;
}

describe('getExpoIosUsePrecompiledModules', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('reads the value from a dynamic app.config.js', () => {
    tempDir = createDynamicConfigExpoProject(false);

    expect(getExpoIosUsePrecompiledModules(tempDir as string)).toBe(false);
  });

  it('returns undefined rather than throwing when plugins cannot be evaluated', () => {
    // createTempExpoProject lists a plugin that fails to load, which is the
    // reason `skipPlugins` is used; the retry must degrade, not crash.
    tempDir = createTempExpoProject();

    expect(() =>
      getExpoIosUsePrecompiledModules(tempDir as string)
    ).not.toThrow();
  });
});
