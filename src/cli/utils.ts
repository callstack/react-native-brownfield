import * as path from 'path';
import * as fs from 'fs';

import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { Command } from 'commander';

import cloneDeep from 'lodash.clonedeep';

import { type PackageAarFlags } from '@rock-js/platform-android';
import type { RockOptions } from './types';

/**
 * Helper function to find project root
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

export const getAarConfig = (
  args: PackageAarFlags,
  androidConfig: AndroidProjectConfig
) => {
  const config = {
    sourceDir: androidConfig.sourceDir,
    moduleName: args.moduleName ?? '',
  };
  return config;
};

export function curryOptions(programCommand: Command, options: RockOptions) {
  options.forEach((option) => {
    programCommand = programCommand.option(option.name, option.description);
  });

  return programCommand;
}

export function makeRelativeAndroidProjectConfigPaths<
  UserCfg extends AndroidProjectConfig | undefined,
>(projectRoot: string, userConfig: UserCfg): UserCfg {
  const relativeConfig = cloneDeep(userConfig);

  if (userConfig?.sourceDir) {
    relativeConfig!.sourceDir = path.relative(
      projectRoot,
      userConfig.sourceDir
    );
  }

  return relativeConfig;
}
