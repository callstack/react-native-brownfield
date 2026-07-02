import fs from 'node:fs';
import path from 'node:path';

import { RockError } from '@rock-js/tools';

import { normalizeCopiedXcframework } from './normalizeCopiedXcframework.js';
import { getExpoSdkMajor, isExpoProject } from './project.js';

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

export function emitExpoSupportXcframeworks({
  projectRoot,
  packageDir,
  usePrebuiltExpo = true,
}: {
  projectRoot: string;
  packageDir: string;
  usePrebuiltExpo?: boolean;
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

  for (const frameworkName of getExpoSupportXcframeworkNames(usePrebuiltExpo)) {
    const sourcePath = resolveExpoFrameworkSourcePath(
      projectRoot,
      frameworkName
    );
    if (!fs.existsSync(sourcePath)) {
      throw new RockError(
        `Expected Expo SDK ${MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO}+ XCFramework not found: ${frameworkName}.xcframework at ${path.relative(projectRoot, sourcePath)}`
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
