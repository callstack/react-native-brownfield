import * as path from 'node:path';
import * as fs from 'node:fs';

import type {
  AndroidProjectConfig,
  IOSProjectConfig,
} from '@react-native-community/cli-types';
import cloneDeep from 'lodash.clonedeep';

export function makeRelativeProjectConfigPaths<
  UserConfig extends AndroidProjectConfig | IOSProjectConfig | undefined,
>(projectRoot: string, userConfig: UserConfig): UserConfig {
  const relativeConfig = cloneDeep(userConfig);

  if (userConfig?.sourceDir) {
    relativeConfig!.sourceDir = path.relative(
      projectRoot,
      userConfig.sourceDir
    );
  }

  return relativeConfig;
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
