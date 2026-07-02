import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AndroidProjectConfig,
  ProjectConfig,
  UserConfig,
} from '@react-native-community/cli-types';
import type { PackageAarFlags } from '@rock-js/platform-android';

import cliConfigImport from '@react-native-community/cli-config';

import { findProjectRoot, makeRelativeProjectConfigPaths } from './paths.js';
import {
  getConfig,
  type ProjectConfig as ExpoProjectConfig,
} from '@expo/config';

const cliConfig: typeof cliConfigImport =
  typeof cliConfigImport === 'function'
    ? cliConfigImport
    : // @ts-expect-error: interop default
      cliConfigImport.default;

function hasExpoAppConfig(projectRoot: string): boolean {
  return (
    fs.existsSync(path.join(projectRoot, 'app.json')) ||
    fs.existsSync(path.join(projectRoot, 'app.config.js')) ||
    fs.existsSync(path.join(projectRoot, 'app.config.ts')) ||
    fs.existsSync(path.join(projectRoot, 'app.config.mjs'))
  );
}

function projectDependsOnExpo(projectRoot: string): boolean {
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf-8')
  ) as Record<string, Record<string, string>>;

  return ['dependencies', 'peerDependencies', 'devDependencies'].some(
    (key) => packageJson[key]?.expo
  );
}

/**
 * Gets the Expo config if the project is an Expo project
 * @param projectRoot The project root path
 * @returns The Expo config if the project is an Expo project, null otherwise
 */
export function getExpoConfigIfIsExpo(projectRoot: string) {
  const hasAppConfig = hasExpoAppConfig(projectRoot);

  try {
    return getConfig(projectRoot, { skipSDKVersionRequirement: true });
  } catch (error) {
    if (hasAppConfig) {
      throw error;
    }

    return null;
  }
}

/**
 * Checks if the project is an Expo project; checks both if installed and explicitly listed
 * in the project's package.json to prevent false positives in a monorepo setup
 * @param projectRoot The project root path
 * @returns Whether the project is an Expo project
 */
export function isExpoProject(projectRoot: string): boolean {
  return hasExpoAppConfig(projectRoot) && projectDependsOnExpo(projectRoot);
}

export function getExpoSdkMajor(projectRoot: string): number | null {
  const rawExpoVersion = getExpoConfigIfIsExpo(projectRoot)?.exp.sdkVersion;
  if (!rawExpoVersion) {
    return null;
  }
  const expoSdkMajor = parseInt(rawExpoVersion.split('.')[0], 10);
  return Number.isFinite(expoSdkMajor) ? expoSdkMajor : null;
}

/**
 * Fills the RNC CLI project config from the Expo config by mutating the passed in `options.projectConfig` object in place
 */
export function fillProjectConfigFromExpoConfig({
  projectConfig,
  expoConfig: { exp },
  projectRoot,
}: {
  /** The RNC CLI project config to be filled */
  projectConfig: ProjectConfig;

  /** The Expo project config */
  expoConfig: ExpoProjectConfig;

  /** The project root path */
  projectRoot: string;
}) {
  if (exp.android) {
    projectConfig['android'] = {
      applicationId: exp.android.package!,
      packageName: exp.android.package!,
      appName: exp.name!,
      assets: [],
      mainActivity: 'MainActivity',
      sourceDir: 'android',
    };
  }

  if (exp.ios) {
    projectConfig['ios'] = {
      assets: [],
      sourceDir: projectRoot,
      xcodeProject: {
        path: '.',
        name: `${exp.name}.xcworkspace`,
        isWorkspace: true,
      },
    };
  }
}

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

  const userConfig = getUserConfig({ projectRoot, platform });
  const platformConfig = userConfig.project[platform as Platform];

  if (!platformConfig) {
    throw new Error(`${platform} project not found.`);
  }

  return {
    projectRoot,
    userConfig,
    platformConfig: platformConfig,
  };
}

export function getUserConfig({
  projectRoot,
  platform,
}: {
  projectRoot: string;
  platform: 'ios' | 'android';
}): UserConfig {
  // resolve the config using RNC CLI
  const userConfig = cliConfig({
    projectRoot,
    selectedPlatform: platform,
  });

  let projectConfig = userConfig.project;

  // below: try augmenting the config with values for Expo projects, if applicable
  const maybeExpoConfig = getExpoConfigIfIsExpo(projectRoot);
  if (maybeExpoConfig) {
    fillProjectConfigFromExpoConfig({
      projectConfig,
      expoConfig: maybeExpoConfig,
      projectRoot,
    });
  }

  // below: relative sourceDir path is required by RN CLI's API
  makeRelativeProjectConfigPaths(projectRoot, projectConfig[platform]);

  return userConfig;
}

/**
 * Gets the AAR packaging configuration for the given Android project
 * @param args The AAR packaging flags
 * @param androidConfig The Android project config
 */
export function getAarConfig(
  args: PackageAarFlags,
  androidConfig: AndroidProjectConfig
) {
  const config = {
    sourceDir: androidConfig.sourceDir,
    moduleName: args.moduleName ?? '',
  };

  return config;
}
