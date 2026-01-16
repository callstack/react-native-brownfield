import type { PackageAarFlags } from '@rock-js/platform-android';
import type {
  AndroidProjectConfig,
  Config as UserConfig,
  ProjectConfig,
} from '@react-native-community/cli-types';
import cliConfigImport from '@react-native-community/cli-config';

const cliConfig: typeof cliConfigImport =
  typeof cliConfigImport === 'function'
    ? cliConfigImport
    : // @ts-expect-error: interop default
      cliConfigImport.default;

import { findProjectRoot, makeRelativeProjectConfigPaths } from './paths.js';

/**
 * Gets the project info for the given platform from the current working directory
 * @param platform the platform for which to get project info
 * @returns project root and android project config
 */
export function getProjectInfo<Platform extends 'ios' | 'android'>(
  platform: Platform
): {
  projectRoot: string;
  userConfig: UserConfig;
  platformConfig: ProjectConfig[Platform];
} {
  const projectRoot = findProjectRoot();

  const userConfig = cliConfig({
    projectRoot,
    selectedPlatform: platform,
  });

  // below: relative sourceDir path is required by RN CLI's API
  const platformConfig = makeRelativeProjectConfigPaths(
    projectRoot,
    userConfig.project[platform]
  );

  if (!platformConfig) {
    throw new Error(`${platform} project not found.`);
  }

  return { projectRoot, userConfig, platformConfig };
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
