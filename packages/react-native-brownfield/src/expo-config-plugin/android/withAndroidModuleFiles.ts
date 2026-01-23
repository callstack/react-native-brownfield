import * as fs from 'node:fs';
import * as path from 'node:path';

import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';

import type {
  RenderedTemplateFile,
  ResolvedBrownfieldPluginConfigWithAndroid,
} from '../types';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

/**
 * Creates the Android library module directory structure and files
 */
export function createAndroidModule(
  androidDir: string,
  config: ResolvedBrownfieldPluginConfigWithAndroid
): void {
  const { android } = config;
  const moduleDir = path.join(androidDir, android.moduleName);

  Logger.logDebug(`Creating Android module in: ${androidDir}`);

  // generate module files
  const files: RenderedTemplateFile[] = [
    {
      relativePath: 'build.gradle.kts',
      content: renderTemplate('android', 'build.gradle.kts', {
        '{{PACKAGE_NAME}}': android.packageName,
        '{{MIN_SDK_VERSION}}': android.minSdkVersion.toString(),
        '{{COMPILE_SDK_VERSION}}': android.compileSdkVersion.toString(),
        '{{GROUP_ID}}': android.groupId,
        '{{ARTIFACT_ID}}': android.artifactId,
        '{{ARTIFACT_VERSION}}': android.version,
      }),
    },
    {
      relativePath: 'gradle.properties',
      content: renderTemplate('android', 'gradle.properties', {}),
    },
    {
      relativePath: 'src/main/AndroidManifest.xml',
      content: renderTemplate('android', 'AndroidManifest.xml', {}),
    },
    {
      relativePath: `src/main/java/${config.android.packageName.replace(/\./g, '/')}/ReactNativeHostManager.kt`,
      content: renderTemplate('android', 'ReactNativeHostManager.kt', {
        '{{PACKAGE_NAME}}': android.packageName,
      }),
    },
  ];

  // write files, possibly creating directories
  for (const file of files) {
    const filePath = path.join(moduleDir, file.relativePath);
    const fileDir = path.dirname(filePath);

    // create directory if it doesn't exist
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, file.content, 'utf8');

    Logger.logDebug(`Created file: ${filePath}`);
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

      createAndroidModule(androidDir, props);

      return dangerousConfig;
    },
  ]);
};
