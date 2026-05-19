import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import Ajv from 'ajv';

import type { BrownfieldConfig } from './types.js';
import { findProjectRoot } from './brownfield/utils/paths.js';

import BrownfieldSchema from '../schema.json' with { type: 'json' };
import { logger } from '@rock-js/tools';
import { Command } from 'commander';

const JS_CONFIG_FILE_NAME = 'react-native-brownfield.config.js';
const JSON_CONFIG_FILE_NAME = 'react-native-brownfield.config.json';
const PACKAGE_JSON_CONFIG_KEY = 'react-native-brownfield';

const SEPARATOR = '\n● ';

const ajv = new Ajv({ allErrors: true });
const validateBrownfieldConfig = ajv.compile(BrownfieldSchema);

export function validateBrownfieldCLIConfig(config: unknown): void {
  if (!validateBrownfieldConfig(config)) {
    logger.warn(`Brownfield configuration has some issues: ${SEPARATOR}${ajv.errorsText(validateBrownfieldConfig.errors, { separator: SEPARATOR, dataVar: 'config' })}.`);
  }
}

export function loadBrownfieldConfig(
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

export function applyBrownfieldCLIConfig(
  program: Command,
  config: BrownfieldConfig
): void {
  for (const [key, value] of Object.entries(config)) {
    program.setOptionValueWithSource(key, value, 'config');
  }
}

export function loadAndApplyBrownfieldCLIConfig(
  program: Command,
  projectRoot?: string
): void {
  const reactNativeBrownfieldConfig = loadBrownfieldConfig(projectRoot);

  logger.debug('Loaded Brownfield CLI config:', reactNativeBrownfieldConfig);

  validateBrownfieldCLIConfig(reactNativeBrownfieldConfig);
  applyBrownfieldCLIConfig(program, reactNativeBrownfieldConfig);
}