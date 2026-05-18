import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import Ajv from 'ajv';

import type { BrownfieldConfig } from './types.js';
import { findProjectRoot } from './utils/paths.js';

import BrownfieldSchema from '../../schema.json' with { type: 'json' };
import { logger } from '@rock-js/tools';

const JS_CONFIG_FILE_NAME = 'react-native-brownfield.config.js';
const JSON_CONFIG_FILE_NAME = 'react-native-brownfield.config.json';
const PACKAGE_JSON_CONFIG_KEY = 'react-native-brownfield';

const SEPARATOR = '\n● ';

const ajv = new Ajv({ allErrors: true });
const validateBrownfieldConfig = ajv.compile(BrownfieldSchema);

export function validateConfig(config: unknown) {
  if (!validateBrownfieldConfig(config)) {
    logger.warn(`Brownfield configuration has some issues: ${SEPARATOR}${ajv.errorsText(validateBrownfieldConfig.errors, { separator: SEPARATOR, dataVar: 'config' })}.`);
  }
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

  const jsConfigFilePath = path.join(projectRoot, JS_CONFIG_FILE_NAME);
  if (fs.existsSync(jsConfigFilePath)) {
    return require(jsConfigFilePath) as BrownfieldConfig;
  }

  const jsonConfigFilePath = path.join(projectRoot, JSON_CONFIG_FILE_NAME);
  if (fs.existsSync(jsonConfigFilePath)) {
    return require(jsonConfigFilePath) as BrownfieldConfig;
  }

  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = require(packageJsonPath) as Record<
    string,
    unknown
  >;

  return packageJson[PACKAGE_JSON_CONFIG_KEY] || {};
}