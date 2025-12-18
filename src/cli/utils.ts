import * as path from 'path';
import * as fs from 'fs';

import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { type PackageAarFlags } from '@rock-js/platform-android';

import { spawn, type SpawnOptions } from 'child_process';
import { Command } from 'commander';
import cloneDeep from 'lodash.clonedeep';

import type { RockOptions } from './types';
import { logger } from '@rock-js/tools';

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
    if (option.parse) {
      programCommand = programCommand.option(
        option.name,
        option.description,
        option.parse,
        option.value
      );
    } else {
      programCommand = programCommand.option(
        option.name,
        option.description,
        option.value
      );
    }
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

export async function executeCommand(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    logger.debug(
      `Executing command '${command}${args ? ' ' + args.join(' ') : ''}'`
    );

    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const chunk = data.toString();

        logger.debug(chunk);

        stdout += chunk;
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const chunk = data.toString();

        logger.debug(chunk);

        stderr += chunk;
      });
    }

    const onSigint = () => {
      child.kill('SIGINT');
    };

    process.once('SIGINT', onSigint);

    child.on('close', (code) => {
      process.removeListener('SIGINT', onSigint);

      if (code !== 0) {
        console.error(stdout);
        console.error(stderr);
        return reject(
          new Error(
            `Command "${command} ${args.join(' ')}" failed with exit code ${code}`
          )
        );
      }

      resolve([stdout, stderr]);
    });

    child.on('error', (err) => {
      process.removeListener('SIGINT', onSigint);
      reject(err);
    });
  });
}

/**
 * Parses the destination name from the xcodebuild destination string.
 * @param destination The xcodebuild destination.
 * @returns The parsed name or path-sanitized original if regex did not match.
 */
export function parseDestinationName(destination: string): string {
  const nameMatch = destination.match(/platform=([^,]+)/);

  if (nameMatch && nameMatch[1]) {
    return nameMatch[1];
  }

  return destination.replace(/[^a-zA-Z0-9]/g, '_');
}
