import * as fs from 'node:fs';
import * as path from 'node:path';

import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';

import type {
  RenderedTemplateFile,
  ResolvedBrownfieldPluginConfigWithAndroid,
} from '../types';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';
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

export function resolveCompileSdkVersionExpression(
  config: ResolvedBrownfieldPluginConfigWithAndroid
): string {
  if (config.android.compileSdkVersion != null) {
    return config.android.compileSdkVersion.toString();
  }

  return 'resolveRootProjectInt("compileSdkVersion")';
}

export function resolveTargetSdkVersionExpression(
  config: ResolvedBrownfieldPluginConfigWithAndroid
): string {
  if (config.android.targetSdkVersion != null) {
    return config.android.targetSdkVersion.toString();
  }

  return 'resolveRootProjectInt("targetSdkVersion")';
}

/**
 * Creates the Android library module directory structure and files
 */
export function createAndroidModule({
  androidDir,
  config,
  rnVersion,
  projectRoot,
}: {
  /**
   * Expo app root (used to detect optional dependencies such as expo-updates)
   */
  projectRoot?: string;
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

  Logger.logDebug(`Creating Android module in: ${androidDir}`);

  const hermesArtifact = getHermesArtifact(rnVersion, projectRoot);
  const compileSdkVersionExpression =
    resolveCompileSdkVersionExpression(config);
  const targetSdkVersionExpression = resolveTargetSdkVersionExpression(config);
  const minifyEnabled =
    (android as { minifyEnabled?: boolean }).minifyEnabled ?? false;
  const extraProguardRules =
    (android as { extraProguardRules?: string[] }).extraProguardRules ?? [];
  const extraProguardRulesText = extraProguardRules.join('\n');
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
        '{{TARGET_SDK_VERSION}}': targetSdkVersionExpression,
        '{{COMPILE_SDK_VERSION}}': compileSdkVersionExpression,
        '{{GROUP_ID}}': android.groupId,
        '{{ARTIFACT_ID}}': android.artifactId,
        '{{ARTIFACT_VERSION}}': android.version,
        '{{RN_VERSION}}': rnVersion,
        '{{HERMES_ARTIFACT}}': `${hermesArtifact.groupId}:${hermesArtifact.artifactId}:${hermesArtifact.version}`,
        '{{IS_MINIFY_ENABLED}}': minifyEnabled.toString(),
      }),
    },
    {
      relativePath: 'gradle.properties',
      content: renderTemplate('android', 'gradle.properties', {}),
    },
    {
      relativePath: `src/main/java/${config.android.packageName.replace(/\./g, '/')}/ReactNativeHostManager.kt`,
      content: renderTemplate('android', 'ReactNativeHostManager.post55.kt', {
        '{{PACKAGE_NAME}}': android.packageName,
      }),
    },
    {
      relativePath: 'consumer-rules.pro',
      content: renderTemplate('android', 'consumer-rules.pro', {}),
    },
    {
      relativePath: 'proguard-rules.pro',
      content: renderTemplate('android', 'proguard-rules.pro', {
        '{{EXTRA_PROGUARD_RULES}}': extraProguardRulesText,
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

      createAndroidModule({
        androidDir,
        config: props,
        rnVersion,
        projectRoot: dangerousConfig.modRequest.projectRoot,
      });

      return dangerousConfig;
    },
  ]);
};
