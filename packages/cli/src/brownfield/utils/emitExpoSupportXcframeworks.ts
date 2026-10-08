import fs from 'node:fs';
import path from 'node:path';

import { logger, RockError } from '@rock-js/tools';

import { normalizeCopiedXcframework } from './normalizeCopiedXcframework.js';
import {
  getExpoIosUsePrecompiledModules,
  getExpoSdkMajor,
  isExpoProject,
} from './project.js';

import { MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO } from './supportsPrebuiltExpo.js';

/**
 * Swift support XCFrameworks
 *
 * These are required for the Expo Image module to work.
 * 
 * TODO: This needs investigation and maybe a discussion with the Expo team.
 */
const SWIFT_SUPPORT_XCFRAMEWORK_NAMES = [
  'SDWebImage',
  'SDWebImageSVGCoder',
  'SDWebImageWebPCoder',
  'SDWebImageAVIFCoder',
  'libavif',
] as const;

export const EXPO_SUPPORT_XCFRAMEWORK_NAMES = [
  'ExpoModulesJSI',
  'ExpoFileSystem',
  'ExpoFont',
  'ExpoModulesCore',
  'ExpoImage',
  'ExpoModulesWorklets'
] as const;

export const ALL_EXPO_SUPPORT_XCFRAMEWORK_NAMES = [
  ...EXPO_SUPPORT_XCFRAMEWORK_NAMES,
  ...SWIFT_SUPPORT_XCFRAMEWORK_NAMES,
] as const;

export function getExpoSupportXcframeworkNames(usePrebuiltExpo: boolean) {
  return usePrebuiltExpo
    ? ALL_EXPO_SUPPORT_XCFRAMEWORK_NAMES
    : (['ExpoModulesJSI'] as const);
}

type SwiftSupportXcframeworkName =
  (typeof SWIFT_SUPPORT_XCFRAMEWORK_NAMES)[number];

type ExpoSupportXcframeworkName =
  (typeof EXPO_SUPPORT_XCFRAMEWORK_NAMES)[number];

function resolveExpoFrameworkSourcePath(
  projectRoot: string,
  frameworkName: SwiftSupportXcframeworkName | ExpoSupportXcframeworkName
) {
  if (frameworkName === 'ExpoModulesJSI') {
    return path.join(
      projectRoot,
      'node_modules',
      'expo-modules-jsi',
      'apple',
      'Products',
      'ExpoModulesJSI.xcframework'
    );
  }

  if (SWIFT_SUPPORT_XCFRAMEWORK_NAMES.includes(frameworkName as SwiftSupportXcframeworkName)) {
    return path.join(
      projectRoot,
      'ios',
      'Pods',
      'ExpoImage',
      `${frameworkName}.xcframework`
    );
  }

  if (EXPO_SUPPORT_XCFRAMEWORK_NAMES.includes(frameworkName as ExpoSupportXcframeworkName)) {
    return path.join(
      projectRoot,
      'ios',
      'Pods',
      frameworkName,
      `${frameworkName}.xcframework`
    );
  }

  throw new RockError(`Unsupported Expo XCFramework: ${frameworkName}`);
}

function getPrebuiltExpoRemedy(projectRoot: string) {
  const cause =
    getExpoIosUsePrecompiledModules(projectRoot) === false
      ? 'expo-build-properties sets ios.usePrecompiledModules to false, so prebuilt Expo XCFrameworks are never produced. '
      : '';
  return `${cause}Either re-run with --use-prebuilt-expo false to build Expo modules from source, or run \`pod install\` (with ios.usePrecompiledModules enabled) to materialize the prebuilts.`;
}

export function emitExpoSupportXcframeworks({
  projectRoot,
  packageDir,
  usePrebuiltExpo = true,
  usePrebuiltExpoExplicit = true,
  onDegradeToSource,
}: {
  projectRoot: string;
  packageDir: string;
  usePrebuiltExpo?: boolean;
  /**
   * Whether `usePrebuiltExpo` was chosen by the user (CLI flag or brownfield.config.json)
   * rather than inferred from the Expo SDK version. When inferred, missing prebuilts
   * degrade to building Expo modules from source instead of throwing.
   */
  usePrebuiltExpoExplicit?: boolean;
  /** Called when an inferred `usePrebuiltExpo` was degraded to `false` because prebuilts are absent */
  onDegradeToSource?: () => void;
}) {
  if (!isExpoProject(projectRoot)) {
    return false;
  }

  const expoSdkMajor = getExpoSdkMajor(projectRoot);
  if (
    expoSdkMajor === null ||
    expoSdkMajor < MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO
  ) {
    return false;
  }

  if (usePrebuiltExpo && !usePrebuiltExpoExplicit) {
    const missingPrebuilts = ALL_EXPO_SUPPORT_XCFRAMEWORK_NAMES.filter(
      (frameworkName) =>
        !fs.existsSync(resolveExpoFrameworkSourcePath(projectRoot, frameworkName))
    );
    // ExpoModulesJSI ships in node_modules and is not a Pods prebuilt; only degrade
    // when Pods-provided prebuilts are absent.
    if (missingPrebuilts.some((name) => name !== 'ExpoModulesJSI')) {
      logger.warn(
        `Prebuilt Expo XCFrameworks were not found (${missingPrebuilts.join(', ')}). ${getPrebuiltExpoRemedy(projectRoot)} Continuing without prebuilt Expo (--use-prebuilt-expo false); pass --use-prebuilt-expo true to make this an error.`
      );
      usePrebuiltExpo = false;
      onDegradeToSource?.();
    }
  }

  for (const frameworkName of getExpoSupportXcframeworkNames(usePrebuiltExpo)) {
    const sourcePath = resolveExpoFrameworkSourcePath(
      projectRoot,
      frameworkName
    );
    if (!fs.existsSync(sourcePath)) {
      throw new RockError(
        `Expected Expo SDK ${MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO}+ XCFramework not found: ${frameworkName}.xcframework at ${path.relative(projectRoot, sourcePath)}. ${getPrebuiltExpoRemedy(projectRoot)}`
      );
    }

    const destinationPath = path.join(
      packageDir,
      `${frameworkName}.xcframework`
    );
    fs.rmSync(destinationPath, { recursive: true, force: true });
    fs.cpSync(sourcePath, destinationPath, { recursive: true });
    normalizeCopiedXcframework(destinationPath);
  }

  return true;
}
