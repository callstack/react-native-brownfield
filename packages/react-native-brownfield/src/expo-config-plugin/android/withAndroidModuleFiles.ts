import * as fs from 'node:fs';
import * as path from 'node:path';

import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';

import type {
  RenderedTemplateFile,
  ResolvedBrownfieldPluginConfigWithAndroid,
} from '../types';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';
import { getExpoInfo } from '../expoUtils';
import {
  type AndroidManifestMetaDataEntry,
  type AndroidStringResourceEntry,
  renderLibraryManifestApplication,
  renderLibraryStringResources,
} from './utils/androidManifest';
import {
  readExpoUpdatesApplicationMetaData,
  readExpoUpdatesStringResources,
} from './utils/expo-updates';
import { getHermesArtifact } from './utils/hermes';

function isExpoUpdatesInstalled(projectRoot: string): boolean {
  try {
    require.resolve('expo-updates/package.json', {
      paths: [projectRoot],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the Android library module directory structure and files
 */
export function createAndroidModule({
  androidDir,
  config,
  rnVersion,
  isExpoPre55,
  projectRoot,
}: {
  /**
   * Expo app root (used to detect optional dependencies such as expo-updates)
   */
  projectRoot?: string;

  /**
   * Whether the Expo project is pre-55
   */
  isExpoPre55: boolean;

  /**
   * The root Android directory path
   */
  androidDir: string;

  /**
   * The resolved RN version
   */
  rnVersion: string;

  /**
   * The resolved Brownfield plugin configuration
   */
  config: ResolvedBrownfieldPluginConfigWithAndroid;
}): void {
  const { android } = config;
  const moduleDir = path.join(androidDir, android.moduleName);
  const hasExpoUpdates =
    projectRoot !== undefined && isExpoUpdatesInstalled(projectRoot);

  Logger.logDebug(`Creating Android module in: ${androidDir}`);

  const hermesArtifact = getHermesArtifact(rnVersion);
  Logger.logDebug(
    `Resolved Hermes artifact: ${hermesArtifact.groupId}:${hermesArtifact.artifactId}:${hermesArtifact.version}`
  );

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
        '{{RN_VERSION}}': rnVersion,
        '{{HERMES_ARTIFACT}}': `${hermesArtifact.groupId}:${hermesArtifact.artifactId}:${hermesArtifact.version}`,
      }),
    },
    {
      relativePath: 'gradle.properties',
      content: renderTemplate('android', 'gradle.properties', {}),
    },
    {
      relativePath: `src/main/java/${config.android.packageName.replace(/\./g, '/')}/ReactNativeHostManager.kt`,
      content: renderTemplate(
        'android',
        isExpoPre55
          ? 'ReactNativeHostManager.pre55.kt'
          : 'ReactNativeHostManager.post55.kt',
        isExpoPre55
          ? {
              '{{PACKAGE_NAME}}': android.packageName,
              '{{EXPO_UPDATES_IMPORTS}}': hasExpoUpdates
                ? 'import expo.modules.updates.UpdatesController'
                : '',
              '{{EXPO_UPDATES_REACT_HOST_BLOCK}}': hasExpoUpdates
                ? '\n        UpdatesController.setReactHost(reactHost)\n'
                : '\n',
            }
          : {
              '{{PACKAGE_NAME}}': android.packageName,
            }
      ),
    },
    {
      relativePath: 'consumer-rules.pro',
      content: renderTemplate('android', 'consumer-rules.pro', {}),
    },
    {
      relativePath: 'proguard-rules.pro',
      content: renderTemplate('android', 'proguard-rules.pro', {}),
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

  syncAndroidModuleExpoUpdatesFromAppFiles({
    androidDir,
    config,
  });

  Logger.logDebug(
    `Android module "${android.moduleName}" created at ${moduleDir}`
  );
}

export function syncAndroidModuleManifest({
  androidDir,
  config,
  expoUpdatesMetaData,
}: {
  androidDir: string;
  config: ResolvedBrownfieldPluginConfigWithAndroid;
  expoUpdatesMetaData: AndroidManifestMetaDataEntry[];
}): void {
  writeAndroidModuleFile(
    path.join(androidDir, config.android.moduleName),
    'src/main/AndroidManifest.xml',
    renderTemplate('android', 'AndroidManifest.xml', {
      '{{APPLICATION_BLOCK}}':
        renderLibraryManifestApplication(expoUpdatesMetaData),
    })
  );
}

export function syncAndroidModuleStringResources({
  androidDir,
  config,
  expoUpdatesStringResources,
}: {
  androidDir: string;
  config: ResolvedBrownfieldPluginConfigWithAndroid;
  expoUpdatesStringResources: AndroidStringResourceEntry[];
}): void {
  writeAndroidModuleFile(
    path.join(androidDir, config.android.moduleName),
    'src/main/res/values/strings.xml',
    renderTemplate('android', 'strings.xml', {
      '{{STRING_RESOURCES}}': renderLibraryStringResources(
        expoUpdatesStringResources
      ),
    })
  );
}

function writeAndroidModuleFile(
  moduleDir: string,
  relativePath: string,
  content: string
): void {
  const filePath = path.join(moduleDir, relativePath);
  const fileDir = path.dirname(filePath);

  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf8');
  Logger.logDebug(`Created file: ${filePath}`);
}

export function syncAndroidModuleExpoUpdatesFromAppFiles({
  androidDir,
  config,
}: {
  androidDir: string;
  config: ResolvedBrownfieldPluginConfigWithAndroid;
}): void {
  const appModuleName = 'app';
  const expoUpdatesMetaData = readExpoUpdatesApplicationMetaData(
    androidDir,
    appModuleName
  );
  const expoUpdatesStringResources = readExpoUpdatesStringResources(
    androidDir,
    appModuleName,
    expoUpdatesMetaData
  );

  syncAndroidModuleManifest({
    androidDir,
    config,
    expoUpdatesMetaData,
  });
  syncAndroidModuleStringResources({
    androidDir,
    config,
    expoUpdatesStringResources,
  });
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

      let rnVersion: string;
      try {
        const rnPkgPath = require.resolve('react-native/package.json', {
          paths: [dangerousConfig.modRequest.projectRoot],
        });

        const rnPkg = require(rnPkgPath);

        rnVersion = rnPkg.version;

        Logger.logDebug(`Resolved react-native version: ${rnVersion}`);
      } catch {
        throw new Error(
          'Could not resolve react-native package version. Please ensure you have installed dependencies.'
        );
      }

      const { isExpoPre55 } = getExpoInfo(config);

      createAndroidModule({
        androidDir,
        config: props,
        rnVersion,
        isExpoPre55,
        projectRoot: dangerousConfig.modRequest.projectRoot,
      });

      return dangerousConfig;
    },
  ]);
};
