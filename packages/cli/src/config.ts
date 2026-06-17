import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import Ajv from 'ajv';

import type { BrownfieldConfig } from './types.js';
import { findProjectRoot } from './brownfield/utils/paths.js';

import BrownfieldSchema from '../schema.json' with { type: 'json' };
import { logger } from '@rock-js/tools';

const CONFIG_BASE_NAME = 'brownfield';
const JS_CONFIG_FILE_NAME = `${CONFIG_BASE_NAME}.config.js`;
const JSON_CONFIG_FILE_NAME = `${CONFIG_BASE_NAME}.config.json`;

const SEPARATOR = '\n● ';

const ajv = new Ajv({ allErrors: true });
const validateBrownfieldConfig = ajv.compile(BrownfieldSchema);

export function validateBrownfieldCLIConfig(config: unknown): void {
  if (!validateBrownfieldConfig(config)) {
    logger.warn(
      `Brownfield configuration has some issues: ${SEPARATOR}${ajv.errorsText(validateBrownfieldConfig.errors, { separator: SEPARATOR, dataVar: 'config' })}.`
    );
  }
}

export function loadBrownfieldConfig(
  projectRoot: string = findProjectRoot()
): BrownfieldConfig {
  const require = createRequire(path.join(projectRoot, 'package.json'));

  const jsConfigFilePath = path.join(projectRoot, JS_CONFIG_FILE_NAME);
  const jsonConfigFilePath = path.join(projectRoot, JSON_CONFIG_FILE_NAME);
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = require(packageJsonPath) as Record<string, unknown>;

  if (
    [
      fs.existsSync(jsConfigFilePath),
      fs.existsSync(jsonConfigFilePath),
      packageJson[CONFIG_BASE_NAME],
    ].filter(Boolean).length > 1
  ) {
    throw new Error('Project has multiple Brownfield configuration files');
  }

  if (fs.existsSync(jsConfigFilePath)) {
    return require(jsConfigFilePath) as BrownfieldConfig;
  }

  if (fs.existsSync(jsonConfigFilePath)) {
    return require(jsonConfigFilePath) as BrownfieldConfig;
  }

  return packageJson[CONFIG_BASE_NAME] || {};
}

type BrownfieldPlatform = 'android' | 'ios';
type ConfigurableOptions = Record<string, unknown>;

function getSharedConfig(config: BrownfieldConfig): ConfigurableOptions {
  return config.verbose === undefined ? {} : { verbose: config.verbose };
}

export function mergeBrownfieldConfigWithOptions<T extends object>(
  options: T,
  platform: BrownfieldPlatform
): T {
  const reactNativeBrownfieldConfig = loadBrownfieldConfig();

  validateBrownfieldCLIConfig(reactNativeBrownfieldConfig);

  const platformConfig = {
    ...getSharedConfig(reactNativeBrownfieldConfig),
    ...reactNativeBrownfieldConfig[platform],
  };

  return {
    ...platformConfig,
    ...Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined)
    ),
  } as T;
}
