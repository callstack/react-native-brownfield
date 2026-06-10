import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { findProjectRoot } from '../brownfield/utils/paths';

export interface BrownieConfig {
  kotlin?: string;
  kotlinPackageName?: string;
}

interface PackageJson {
  brownie?: BrownieConfig;
}

function loadPackageJson(projectRoot: string = findProjectRoot()): PackageJson {
  const packageJsonPath = path.resolve(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
}

/**
 * Checks if @callstack/brownie package is installed.
 */
export function isBrownieInstalled(
  projectRoot: string = findProjectRoot()
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
  projectRoot: string = findProjectRoot()
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
  projectRoot: string = findProjectRoot()
): string {
  const browniePath = getBrowniePackagePath(projectRoot);
  return path.join(browniePath, 'ios', 'Generated');
}

/**
 * Returns whether package.json contains legacy brownie config.
 */
export function hasLegacyConfig(
  projectRoot: string = findProjectRoot()
): boolean {
  const packageJson = loadPackageJson(projectRoot);

  return Object.prototype.hasOwnProperty.call(packageJson, 'brownie');
}

/**
 * Loads brownie config from package.json in the current working directory.
 */
export function loadConfig(): BrownieConfig {
  const packageJson = loadPackageJson();

  return packageJson.brownie ?? {};
}
