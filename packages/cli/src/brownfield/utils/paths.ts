import * as path from 'node:path';
import * as fs from 'node:fs';

import type {
  AndroidProjectConfig,
  IOSProjectConfig,
} from '@react-native-community/cli-types';

/**
 * Helper function to mutate the user config paths in place to be relative to the project root
 * @param projectRoot The path to the project root directory
 * @param userConfig User configuration from the RNC CLI
 */
export function makeRelativeProjectConfigPaths<
  UserConfig extends AndroidProjectConfig | IOSProjectConfig | undefined,
>(projectRoot: string, userConfig: UserConfig) {
  if (userConfig?.sourceDir) {
    userConfig.sourceDir = path.relative(projectRoot, userConfig.sourceDir);
  }
}

/**
 * Helper function to find RN project root by recursively looking for a package.json in the parent directories
 * @returns The path to the project root directory
 */
export function findProjectRoot(): string {
  let currentDir = process.cwd();

  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error('Could not find project root (no package.json found)');
}
