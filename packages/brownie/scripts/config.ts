import fs from 'fs';
import path from 'path';

export interface StoresConfig {
  schema: string;
  typeName: string;
  swift?: string;
  kotlin?: string;
  kotlinPackageName?: string;
}

export interface BrownieConfig {
  stores?: StoresConfig[];
}

interface PackageJson {
  brownie?: BrownieConfig;
}

function validateStoreConfig(config: StoresConfig, index?: number): void {
  const prefix =
    index !== undefined ? `brownie.stores[${index}]` : 'brownie.stores';

  if (!config.schema) {
    throw new Error(`${prefix}.schema is required`);
  }

  if (!config.typeName) {
    throw new Error(`${prefix}.typeName is required`);
  }

  if (!config.swift && !config.kotlin) {
    throw new Error(
      `At least one output path is required: ${prefix}.swift or ${prefix}.kotlin`
    );
  }
}

/**
 * Loads brownie config from package.json in the current working directory.
 * Supports both single store config and array of store configs.
 */
export function loadConfig(): StoresConfig[] {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson: PackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf-8')
  );
  const config = packageJson.brownie?.stores;

  if (!config) {
    throw new Error('brownie.stores config not found in package.json');
  }

  if (!Array.isArray(config)) {
    throw new Error('brownie.stores must be an array');
  }

  if (config.length === 0) {
    throw new Error('brownie.stores array cannot be empty');
  }

  config.forEach((c, i) => validateStoreConfig(c, i));

  return config;
}
