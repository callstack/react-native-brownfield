import fs from 'fs';
import path from 'path';

export interface BrownieConfig {
  swift?: string;
  kotlin?: string;
  kotlinPackageName?: string;
}

interface PackageJson {
  brownie?: BrownieConfig;
}

function validateConfig(config: BrownieConfig): void {
  if (!config.swift && !config.kotlin) {
    throw new Error(
      'At least one output path is required: brownie.swift or brownie.kotlin'
    );
  }
}

/**
 * Loads brownie config from package.json in the current working directory.
 */
export function loadConfig(): BrownieConfig {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson: PackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf-8')
  );
  const config = packageJson.brownie;

  if (!config) {
    throw new Error('brownie config not found in package.json');
  }

  validateConfig(config);

  return config;
}
