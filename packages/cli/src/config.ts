import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import Ajv from 'ajv';

import type { BrownfieldConfig } from './types.js';
import { findProjectRoot } from './brownfield/utils/paths.js';

import BrownfieldSchema from '../schema.json' with { type: 'json' };
import { logger } from '@rock-js/tools';

export const CONFIG_BASE_NAME = 'brownfield';
export const JS_CONFIG_FILE_NAME = `${CONFIG_BASE_NAME}.config.js`;
export const JSON_CONFIG_FILE_NAME = `${CONFIG_BASE_NAME}.config.json`;

const SEPARATOR = '\n● ';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
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
): BrownfieldConfig | null {
  const require = createRequire(path.join(projectRoot, 'package.json'));

  const jsConfigFilePath = path.join(projectRoot, JS_CONFIG_FILE_NAME);
  const jsonConfigFilePath = path.join(projectRoot, JSON_CONFIG_FILE_NAME);
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = require(packageJsonPath) as Record<string, unknown>;

  if (
    [
      fs.existsSync(jsConfigFilePath),
      fs.existsSync(jsonConfigFilePath),
      CONFIG_BASE_NAME in packageJson,
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

  if (CONFIG_BASE_NAME in packageJson) {
    return (packageJson[CONFIG_BASE_NAME] as BrownfieldConfig) ?? {};
  }

  return null;
}

type BrownfieldPlatform = 'android' | 'ios';
type ConfigurableOptions = Record<string, unknown>;

function getSharedConfig(config: BrownfieldConfig): ConfigurableOptions {
  return config.verbose === undefined ? {} : { verbose: config.verbose };
}

function formatConfigValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function areConfigValuesEqual(configValue: unknown, optionValue: unknown) {
  return JSON.stringify(configValue) === JSON.stringify(optionValue);
}

export function mergeBrownfieldConfigWithOptions<T extends object>(
  options: T,
  platform: BrownfieldPlatform
): T {
  const reactNativeBrownfieldConfig = loadBrownfieldConfig() ?? {};

  validateBrownfieldCLIConfig(reactNativeBrownfieldConfig);

  const platformConfig: ConfigurableOptions = {
    ...getSharedConfig(reactNativeBrownfieldConfig),
    ...reactNativeBrownfieldConfig[platform],
  };

  const cliOptions = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  );

  for (const [key, value] of Object.entries(cliOptions)) {
    const configValue = platformConfig[key];

    if (
      configValue !== undefined &&
      !areConfigValuesEqual(configValue, value)
    ) {
      logger.warn(
        'CLI option "%s" is overriding the react-native-brownfield config value: %s -> %s.',
        key,
        formatConfigValue(configValue),
        formatConfigValue(value)
      );
    }
  }

  const mergedOptions = {
    ...platformConfig,
    ...cliOptions,
  } as T & { verbose?: unknown };

  if (typeof mergedOptions.verbose === 'boolean') {
    logger.setVerbose(mergedOptions.verbose);
  }

  return mergedOptions;
}
