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
  stores?: StoresConfig;
}

interface PackageJson {
  brownie?: BrownieConfig;
}

/**
 * Loads brownie config from package.json in the current working directory.
 */
export function loadConfig(): StoresConfig {
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

  if (!config.schema) {
    throw new Error('brownie.stores.schema is required');
  }

  if (!config.typeName) {
    throw new Error('brownie.stores.typeName is required');
  }

  if (!config.swift && !config.kotlin) {
    throw new Error(
      'At least one output path is required: brownie.stores.swift or brownie.stores.kotlin'
    );
  }

  return config;
}
