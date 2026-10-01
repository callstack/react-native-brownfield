// Emitted as a triple-slash reference into the generated scaffold .d.ts, so
// consumers (e.g. create-react-native-brownfield) resolve the untyped `xcode`
// import through this single declaration instead of duplicating xcode.d.ts.
/// <reference path="./xcode.d.ts" />
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { ModProps, XcodeProject } from '@expo/config-plugins';
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
import {
  addBrownfieldDependencies,
  addBrownfieldPackageScripts,
  writeBrownfieldFileConfig,
} from './projectFiles';

// ESM/CJS interop shim: `@react-native-community/cli-config` ships CJS whose
// default export is the function itself, but depending on how this module is
// loaded (bundler/ESM interop) the import may be the module namespace object
// with the function on `.default`. Unwrap to the callable either way —
// do not remove, otherwise the scaffold crashes with "cliConfig is not a function".
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
  while (true) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  throw new Error('Could not find project root (no package.json found)');
}

function resolveUserConfig(projectRoot: string): UserConfig {
  // Do not pass selectedPlatform: it restricts detection to a single platform
  // and would leave project.android undefined.
  return cliConfig({
    projectRoot,
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
  // The shipped build is CommonJS, where bare `require` works. If this module
  // is ever loaded as true ESM, bare `require` is undefined; fall back to an
  // explicit `createRequire`. Anchored at cwd (not `import.meta.url`) because
  // Babel keeps `import.meta` verbatim in the CJS output, which is a parse
  // SyntaxError there.
  const localRequire: NodeRequire =
    typeof require === 'undefined'
      ? createRequire(path.join(process.cwd(), 'noop.js'))
      : require;
  const rnPkgPath = localRequire.resolve('react-native/package.json', {
    paths: [projectRoot],
  });
  const rnPkg = localRequire(rnPkgPath);
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

  // Tracks the current mutation phase so a mid-way failure can name the step
  // that failed and point users at fix-forward guidance (see catch below).
  let currentStep = 'preconditions';

  try {
    currentStep = 'android-gradle';
    // --- Android: root build.gradle + settings.gradle ---
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
        // minSdk has no rootProject fallback in the shared build.gradle.kts
        // template (it renders a literal), so keep the Expo plugin default.
        // RN CLI rootProject.ext.minSdkVersion is 24 on current templates
        // anyway; the generated build.gradle.kts stays readable.
        minSdkVersion: 24,
        // compile/target SDK are intentionally not hardcoded: leaving them
        // unset makes the shared template fall back to
        // resolveRootProjectInt("compileSdkVersion"/"targetSdkVersion"), i.e.
        // the app's own rootProject.ext values (RN 0.87 needs compileSdk 37+;
        // AGP 9 rejects library `targetSdk` entirely — see
        // renderTargetSdkBlock). Proven against a real RN 0.87.1 app.
        targetSdkVersion: undefined,
        compileSdkVersion: undefined,
        groupId: androidPackageName,
        artifactId: androidModuleName,
        version: '0.0.1-SNAPSHOT',
        // Fields added to the resolved config after the original draft was
        // written (BGP local-plugin wiring + flavor dimensions, #448/#458).
        // Defaults match the Expo plugin defaults for RN CLI projects.
        useLocalGradlePlugin: false,
        useLocalMaven: false,
        missingDimensionStrategies: [],
      },
      ios: null,
      debug: options.debug ?? false,
    };

    currentStep = 'android-module';
    createAndroidModule({
      androidDir,
      config: resolvedAndroidConfig,
      rnVersion,
      // 'vanilla' = non-Expo host (same axis as `useExpoHost: false` below).
      templateVariant: 'vanilla',
    });

    // --- iOS: xcodeproj + Podfile + framework source files ---
    currentStep = 'ios-project';
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
        // Defaults aligned with the Expo plugin defaults (Expo's fallback
        // when no deployment target can be derived; see
        // resolveFrameworkDeploymentTarget). RN CLI config does not expose
        // an iOS deployment target directly.
        // TODO: derive from the Podfile `platform :ios` line or RN's
        // min_ios_version_supported, or expose a flag.
        deploymentTarget: '15.0',
        // Standard CFBundleShortVersionString for the generated framework
        // (matches the Expo plugin default); unrelated to package versioning.
        frameworkVersion: '1',
      },
      android: null,
      debug: options.debug ?? false,
    };

    // Contract: downstream helpers (xcodeHelpers.addFrameworkTarget /
    // resolveAppTargetName) only read `platformProjectRoot` (framework group
    // location) and `projectName` (app-target-name fallback), but the shared
    // Expo-path signatures require a full ModProps, so we provide every field
    // with scaffold-appropriate values (no mods are run here, so `introspect`
    // is false and `nextMod` is omitted).
    const modRequest: ModProps<XcodeProject> = {
      projectRoot,
      platformProjectRoot: iosDir,
      modName: 'react-native-brownfield-scaffold',
      platform: 'ios',
      introspect: false,
      projectName: path.basename(xcodeprojPath, '.xcodeproj'),
    };

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
    // xcode@3.x writeSync() returns the serialized project but does not write it.
    // This is the riskiest write: a failure here leaves a partially mutated
    // pbxproj on disk (the in-memory changes are lost, not half-written).
    fs.writeFileSync(pbxprojPath, project.writeSync());

    currentStep = 'ios-podfile';
    const podfilePath = path.join(iosDir, 'Podfile');
    const podfile = readFileIfExists(podfilePath);
    if (!podfile) {
      throw new Error(`Missing ${podfilePath}`);
    }
    writeFileIfChanged(podfilePath, modifyPodfile(podfile, iosFrameworkName));

    currentStep = 'ios-sources';
    createIosFramework(iosDir, resolvedIosConfig, { useExpoHost: false });

    // --- App package wiring: Brownfield deps + package:* scripts ---
    // The scaffolded Kotlin host imports com.callstack.reactnativebrownfield.*,
    // so the JS/runtime package must be an app dependency for native builds to
    // resolve it. Idempotent: existing version specs are left untouched.
    currentStep = 'package-dependencies';
    addBrownfieldDependencies(projectRoot);

    currentStep = 'package-scripts';
    addBrownfieldPackageScripts(projectRoot);

    // --- brownfield.config.json: packaging settings for `brownfield package:*` ---
    // Deterministic content derived from the scaffolded names, so re-runs
    // produce identical bytes (overwrite == no-op).
    currentStep = 'brownfield-config';
    writeBrownfieldFileConfig(projectRoot, {
      iosFrameworkName,
      androidModuleName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.logInfo(
      'Scaffolding failed mid-way; fix-forward: re-running the CLI is idempotent for completed steps (gradle settings, Podfile, xcodeproj target detection, package.json deps/scripts, brownfield.config.json) — inspect partial changes with git diff.'
    );
    throw new Error(
      `Brownfield scaffolding failed during step "${currentStep}": ${message}`,
      {
        cause: error,
      }
    );
  }

  Logger.logInfo('Brownfield scaffolding complete.');
}
