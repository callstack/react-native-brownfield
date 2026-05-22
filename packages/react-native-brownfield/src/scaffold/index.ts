import fs from 'node:fs';
import path from 'node:path';

import type { UserConfig } from '@react-native-community/cli-types';
import cliConfigImport from '@react-native-community/cli-config';
import xcode from 'xcode';

import { Logger } from '../expo-config-plugin/logging';
import type {
  ResolvedBrownfieldPluginConfigWithAndroid,
  ResolvedBrownfieldPluginConfigWithIos,
} from '../expo-config-plugin/types';
import {
  modifyRootBuildGradle,
  modifySettingsGradle,
} from '../expo-config-plugin/android/utils/gradleHelpers';
import { createAndroidModule } from '../expo-config-plugin/android/withAndroidModuleFiles';
import { modifyPodfile } from '../expo-config-plugin/ios/podfileHelpers';
import {
  addFrameworkTarget,
  addSourceFilesBuildPhase,
  copyBundleReactNativePhase,
} from '../expo-config-plugin/ios/xcodeHelpers';
import { createIosFramework } from '../expo-config-plugin/ios/withIosFrameworkFiles';

const cliConfig: typeof cliConfigImport =
  typeof cliConfigImport === 'function'
    ? cliConfigImport
    : (cliConfigImport as any).default;

export type BrownfieldScaffoldOptions = {
  /**
   * React Native project root directory (contains package.json).
   * Defaults to current working directory.
   */
  projectRoot?: string;

  /**
   * iOS framework target name (also framework directory name).
   * Defaults to "BrownfieldLib".
   */
  iosFrameworkName?: string;

  /**
   * Android library module folder / Gradle module name.
   * Defaults to "brownfieldlib".
   */
  androidModuleName?: string;

  /**
   * Enables verbose logging.
   */
  debug?: boolean;
};

function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find project root (no package.json found)');
}

function resolveUserConfig(projectRoot: string): UserConfig {
  return cliConfig({
    projectRoot,
    selectedPlatform: 'ios',
  }) as UserConfig;
}

function readFileIfExists(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function writeFileIfChanged(filePath: string, next: string) {
  const prev = readFileIfExists(filePath);
  if (prev === next) return;
  fs.writeFileSync(filePath, next, 'utf8');
}

function firstXcodeprojPath(iosDir: string): string {
  const entries = fs.readdirSync(iosDir, { withFileTypes: true });
  const xcodeproj = entries.find(
    (e) => e.isDirectory() && e.name.endsWith('.xcodeproj')
  );
  if (!xcodeproj) {
    throw new Error(
      `Could not find an .xcodeproj under ${iosDir}. Did you run iOS project generation?`
    );
  }
  return path.join(iosDir, xcodeproj.name);
}

function unquote(value: string): string {
  return value.replace(/^"+|"+$/g, '');
}

function resolveIosAppBundleId(pbxproj: any): string | null {
  const nativeTargets = pbxproj.pbxNativeTargetSection?.() ?? {};
  const configLists = pbxproj.pbxXCConfigurationList?.() ?? {};
  const buildConfigs = pbxproj.pbxXCBuildConfigurationSection?.() ?? {};

  for (const [key, target] of Object.entries<any>(nativeTargets)) {
    if (key.endsWith('_comment')) continue;
    // heuristic: application targets usually have productType including "application"
    if (
      typeof target?.productType === 'string' &&
      !target.productType.includes('application')
    ) {
      continue;
    }

    const configListId = target?.buildConfigurationList;
    const configList = configLists?.[configListId];
    const debugConfigId = configList?.buildConfigurations?.find?.(
      (c: any) => c?.comment === 'Debug'
    )?.value;
    const debugConfig = debugConfigId ? buildConfigs?.[debugConfigId] : null;
    const bundleId = debugConfig?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER;
    if (typeof bundleId === 'string' && bundleId.length > 0) {
      return unquote(bundleId);
    }
  }

  return null;
}

function resolveReactNativeVersion(projectRoot: string): string {
  const rnPkgPath = require.resolve('react-native/package.json', {
    paths: [projectRoot],
  });
  const rnPkg = require(rnPkgPath);
  if (!rnPkg?.version) {
    throw new Error('Could not resolve react-native version from package.json');
  }
  return rnPkg.version;
}

export async function scaffoldBrownfieldInRncCliProject(
  options: BrownfieldScaffoldOptions = {}
): Promise<void> {
  const projectRoot = findProjectRoot(
    path.resolve(options.projectRoot ?? process.cwd())
  );
  Logger.setIsDebug(options.debug ?? false);

  const userConfig = resolveUserConfig(projectRoot);
  const android = userConfig.project.android;
  const ios = userConfig.project.ios;

  if (!android) {
    throw new Error('Android project not found.');
  }
  if (!ios) {
    throw new Error('iOS project not found.');
  }

  const androidDir = path.isAbsolute(android.sourceDir)
    ? android.sourceDir
    : path.join(projectRoot, android.sourceDir || 'android');
  const iosDir = path.join(projectRoot, 'ios');

  const rnVersion = resolveReactNativeVersion(projectRoot);

  const iosFrameworkName = options.iosFrameworkName ?? 'BrownfieldLib';
  const androidModuleName = options.androidModuleName ?? 'brownfieldlib';
  const androidPackageName = android.packageName ?? android.applicationId;
  if (!androidPackageName) {
    throw new Error(
      'Could not resolve Android package name from React Native CLI config.'
    );
  }

  // --- Android: root build.gradle + settings.gradle + module files ---
  const rootBuildGradlePath = path.join(androidDir, 'build.gradle');
  const rootBuildGradle = readFileIfExists(rootBuildGradlePath);
  if (!rootBuildGradle) {
    throw new Error(`Missing ${rootBuildGradlePath}`);
  }
  writeFileIfChanged(
    rootBuildGradlePath,
    modifyRootBuildGradle(rootBuildGradle)
  );

  const settingsGradlePath = path.join(androidDir, 'settings.gradle');
  const settingsGradle = readFileIfExists(settingsGradlePath);
  if (!settingsGradle) {
    throw new Error(`Missing ${settingsGradlePath}`);
  }
  writeFileIfChanged(
    settingsGradlePath,
    modifySettingsGradle(settingsGradle, androidModuleName)
  );

  const resolvedAndroidConfig: ResolvedBrownfieldPluginConfigWithAndroid = {
    android: {
      moduleName: androidModuleName,
      packageName: androidPackageName,
      minSdkVersion: 24,
      targetSdkVersion: 35,
      compileSdkVersion: 35,
      groupId: androidPackageName,
      artifactId: androidModuleName,
      version: '0.0.1-SNAPSHOT',
    },
    ios: null,
    debug: options.debug ?? false,
  };

  createAndroidModule({
    androidDir,
    config: resolvedAndroidConfig,
    rnVersion,
    templateVariant: 'vanilla',
  });

  // --- iOS: xcodeproj + Podfile + framework source files ---
  const xcodeprojPath = firstXcodeprojPath(iosDir);
  const pbxprojPath = path.join(xcodeprojPath, 'project.pbxproj');
  if (!fs.existsSync(pbxprojPath)) {
    throw new Error(`Missing ${pbxprojPath}`);
  }

  const project = xcode.project(pbxprojPath);
  project.parseSync();

  const appBundleId = resolveIosAppBundleId(project);
  const brownfieldBundleId = appBundleId
    ? `${appBundleId}.brownfield`
    : `com.brownfield.${iosFrameworkName.toLowerCase()}`;

  const resolvedIosConfig: ResolvedBrownfieldPluginConfigWithIos = {
    ios: {
      frameworkName: iosFrameworkName,
      bundleIdentifier: brownfieldBundleId,
      buildSettings: {},
      deploymentTarget: '15.0',
      frameworkVersion: '1',
    },
    android: null,
    debug: options.debug ?? false,
  };

  const modRequest = {
    platformProjectRoot: iosDir,
    projectName: path.basename(xcodeprojPath, '.xcodeproj'),
  } as any;

  const { frameworkTargetUUID } = addFrameworkTarget(
    project,
    modRequest,
    resolvedIosConfig.ios,
    { useExpoHost: false }
  );

  copyBundleReactNativePhase(project, frameworkTargetUUID);
  addSourceFilesBuildPhase(
    project,
    frameworkTargetUUID,
    resolvedIosConfig.ios,
    { useExpoHost: false }
  );
  project.writeSync();

  const podfilePath = path.join(iosDir, 'Podfile');
  const podfile = readFileIfExists(podfilePath);
  if (!podfile) {
    throw new Error(`Missing ${podfilePath}`);
  }
  writeFileIfChanged(podfilePath, modifyPodfile(podfile, iosFrameworkName));

  createIosFramework(iosDir, resolvedIosConfig, { useExpoHost: false });

  Logger.logInfo('Brownfield scaffolding complete.');
}
