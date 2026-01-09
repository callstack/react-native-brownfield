import type { PackageAarFlags } from '@rock-js/platform-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import loadConfig from '@react-native-community/cli-config';

import { makeRelativeRNCLIProjectConfigPaths } from './paths';
import { findProjectRoot } from '../utils';

/**
 * Gets the Android project info from the current working directory
 * @returns project root and android project config
 */
export function getAndroidProjectInfo() {
  const projectRoot = findProjectRoot();
  const userConfig = loadConfig({ projectRoot, selectedPlatform: 'android' });

  // below: relative sourceDir path is required by RN CLI's API
  const androidConfig = makeRelativeRNCLIProjectConfigPaths(
    projectRoot,
    userConfig.project.android
  );

  if (!androidConfig) {
    throw new Error('Android project not found.');
  }

  return { projectRoot, androidConfig };
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
