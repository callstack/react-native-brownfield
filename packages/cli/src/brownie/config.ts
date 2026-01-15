import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export interface BrownieConfig {
  kotlin?: string;
  kotlinPackageName?: string;
}

interface PackageJson {
  brownie?: BrownieConfig;
}

/**
 * Checks if @callstack/brownie package is installed.
 */
export function isBrownieInstalled(
  projectRoot: string = process.cwd()
): boolean {
  const require = createRequire(path.join(projectRoot, 'package.json'));
  try {
    require.resolve('@callstack/brownie/package.json');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the path to the @callstack/brownie package.
 */
export function getBrowniePackagePath(
  projectRoot: string = process.cwd()
): string {
  const require = createRequire(path.join(projectRoot, 'package.json'));
  try {
    const browniePackageJson =
      require.resolve('@callstack/brownie/package.json');
    return path.dirname(browniePackageJson);
  } catch {
    throw new Error(
      "@callstack/brownie is not installed. Run 'npm install @callstack/brownie' or 'yarn add @callstack/brownie'"
    );
  }
}

/**
 * Returns the output path for generated Swift files.
 */
export function getSwiftOutputPath(
  projectRoot: string = process.cwd()
): string {
  const browniePath = getBrowniePackagePath(projectRoot);
  return path.join(browniePath, 'ios', 'Generated');
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

  return config;
}
