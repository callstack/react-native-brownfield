import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  getModuleBuildGradle,
  getModuleGradleProperties,
  getModuleAndroidManifest,
} from './gradleHelpers';
import { generateReactNativeHostManager } from './hostManagerGenerator';
import type { ResolvedBrownfieldPluginConfigWithAndroid } from '../types';
import { Logger } from '../logging';

interface ModuleFile {
  relativePath: string;
  content: string;
}

/**
 * Creates the Android library module directory structure and files
 */
export function createAndroidModule(
  androidDir: string,
  config: ResolvedBrownfieldPluginConfigWithAndroid
): void {
  const { android } = config;
  const moduleDir = path.join(androidDir, android.moduleName);

  // Create module directory structure
  const dirs = [
    moduleDir,
    path.join(moduleDir, 'src'),
    path.join(moduleDir, 'src', 'main'),
    path.join(moduleDir, 'src', 'main', 'java'),
    path.join(moduleDir, 'src', 'main', 'res'),
    ...android.packageName.split('.').reduce<string[]>((acc, part, index) => {
      const prevPath =
        index === 0
          ? path.join(moduleDir, 'src', 'main', 'java')
          : acc[acc.length - 1];
      acc.push(path.join(prevPath, part));
      return acc;
    }, []),
  ];

  // Create directories
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      Logger.logDebug(`Created directory: ${dir}`);
    }
  }

  // Generate module files
  const files: ModuleFile[] = [
    {
      relativePath: 'build.gradle.kts',
      content: getModuleBuildGradle(android),
    },
    {
      relativePath: 'gradle.properties',
      content: getModuleGradleProperties(),
    },
    {
      relativePath: 'src/main/AndroidManifest.xml',
      content: getModuleAndroidManifest(android.packageName),
    },
  ];

  // Add ReactNativeHostManager if configured
  if (android.includeHostManager) {
    const hostManager = generateReactNativeHostManager({
      packageName: android.packageName,
    });
    files.push({
      relativePath: hostManager.path,
      content: hostManager.content,
    });
  }

  // Write files
  for (const file of files) {
    const filePath = path.join(moduleDir, file.relativePath);
    const fileDir = path.dirname(filePath);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Only write if file doesn't exist or content is different
    if (
      !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, 'utf8') !== file.content
    ) {
      fs.writeFileSync(filePath, file.content, 'utf8');
      Logger.logDebug(`Created file: ${filePath}`);
    }
  }

  Logger.logDebug(
    `Android module "${android.moduleName}" created at ${moduleDir}`
  );
}

/**
 * Dangerous mod that creates the Android module directory and files
 */
export const withAndroidModuleFiles: ConfigPlugin<
  ResolvedBrownfieldPluginConfigWithAndroid
> = (config, props) => {
  return withDangerousMod(config, [
    'android',
    async (dangerousConfig) => {
      const androidDir = path.join(
        dangerousConfig.modRequest.projectRoot,
        'android'
      );

      Logger.logDebug(`Creating Android module in: ${androidDir}`);

      createAndroidModule(androidDir, props);

      return dangerousConfig;
    },
  ]);
};
