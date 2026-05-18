import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { BrownfieldConfig } from './types.js';
import { findProjectRoot } from './utils/paths.js';

const CONFIG_FILE_NAMES = [
  'react-native-brownfield.config.js',
  'react-native-brownfield.config.json',
] as const;

const PACKAGE_JSON_CONFIG_KEY = 'react-native-brownfield';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateConfig(value: unknown, source: string): BrownfieldConfig {
  if (!isRecord(value)) {
    throw new Error(
      `Brownfield config in ${source} must export an object.`
    );
  }

  return value as BrownfieldConfig;
}

function normalizeModuleValue(
  moduleValue: unknown,
  source: string
): BrownfieldConfig {
  if (
    isRecord(moduleValue) &&
    'default' in moduleValue &&
    moduleValue.default !== undefined
  ) {
    return validateConfig(moduleValue.default, source);
  }

  return validateConfig(moduleValue, source);
}

function loadModuleFromFile(
  require: ReturnType<typeof createRequire>,
  filePath: string
) {
  const resolvedPath = require.resolve(filePath);
  delete require.cache[resolvedPath];
  return require(resolvedPath);
}

function loadConfigFromFile(
  require: ReturnType<typeof createRequire>,
  filePath: string
): BrownfieldConfig {
    return normalizeModuleValue(
      loadModuleFromFile(require, filePath),
      path.basename(filePath)
    );
}

/**
 * Loads Brownfield CLI config from project root.
 * Search order:
 * 1. react-native-brownfield.config.js
 * 2. react-native-brownfield.config.json
 * 3. package.json#react-native-brownfield
 */
export function loadConfig(
  projectRoot: string = findProjectRoot()
): BrownfieldConfig {
  const require = createRequire(path.join(projectRoot, 'package.json'));

  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(projectRoot, fileName);
    if (fs.existsSync(filePath)) {
      return loadConfigFromFile(require, filePath);
    }
  }

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {};
  }

  const packageJson = loadModuleFromFile(require, packageJsonPath) as Record<
    string,
    unknown
  >;

  const packageJsonConfig = packageJson[PACKAGE_JSON_CONFIG_KEY];
  if (packageJsonConfig === undefined) {
    return {};
  }

  return validateConfig(packageJsonConfig, 'package.json');
}