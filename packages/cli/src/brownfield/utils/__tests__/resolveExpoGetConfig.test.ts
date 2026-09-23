import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getConfig as bundledGetConfig } from '@expo/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getExpoConfigIfIsExpo, resolveExpoGetConfig } from '../project.js';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

describe('resolveExpoGetConfig', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'resolve-expo-get-config-')
    );
    writeFile(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'app', dependencies: { expo: '*' } })
    );
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it("uses the project's own expo/config when installed", () => {
    writeFile(
      path.join(projectRoot, 'node_modules/expo/package.json'),
      JSON.stringify({ name: 'expo', version: '58.0.0' })
    );
    writeFile(
      path.join(projectRoot, 'node_modules/expo/config.js'),
      `module.exports = {
        getConfig: (projectRoot) => ({ exp: { name: 'from-project', sdkVersion: '58.0.0' }, projectRoot }),
      };`
    );

    const getConfig = resolveExpoGetConfig(projectRoot);

    expect(getConfig).not.toBe(bundledGetConfig);
    expect(getExpoConfigIfIsExpo(projectRoot)?.exp.name).toBe('from-project');
  });

  it('falls back to the bundled @expo/config when the project has no expo package', () => {
    expect(resolveExpoGetConfig(projectRoot)).toBe(bundledGetConfig);
  });

  it('falls back to the bundled @expo/config when expo/config has no getConfig', () => {
    writeFile(
      path.join(projectRoot, 'node_modules/expo/package.json'),
      JSON.stringify({ name: 'expo', version: '58.0.0' })
    );
    writeFile(
      path.join(projectRoot, 'node_modules/expo/config.js'),
      'module.exports = {};'
    );

    expect(resolveExpoGetConfig(projectRoot)).toBe(bundledGetConfig);
  });
});
