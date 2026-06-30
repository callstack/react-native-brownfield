import fs from 'node:fs';
import path from 'node:path';

import { RockError } from '@rock-js/tools';

import { normalizeCopiedXcframework } from './normalizeCopiedXcframework.js';
import { getExpoSdkMajor, isExpoProject } from './project.js';

const MIN_EXPO_SDK_MAJOR_FOR_SUPPORT_XCFRAMEWORKS = 56;

export const EXPO_SUPPORT_XCFRAMEWORK_NAMES = ['ExpoModulesJSI'] as const;

type ExpoSupportXcframeworkName =
  (typeof EXPO_SUPPORT_XCFRAMEWORK_NAMES)[number];

function resolveExpoFrameworkSourcePath(
  projectRoot: string,
  frameworkName: ExpoSupportXcframeworkName
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

  throw new RockError(`Unsupported Expo XCFramework: ${frameworkName}`);
}

export function emitExpoSupportXcframeworks({
  projectRoot,
  packageDir,
}: {
  projectRoot: string;
  packageDir: string;
}) {
  if (!isExpoProject(projectRoot)) {
    return false;
  }

  const expoSdkMajor = getExpoSdkMajor(projectRoot);
  if (
    expoSdkMajor === null ||
    expoSdkMajor < MIN_EXPO_SDK_MAJOR_FOR_SUPPORT_XCFRAMEWORKS
  ) {
    return false;
  }

  for (const frameworkName of EXPO_SUPPORT_XCFRAMEWORK_NAMES) {
    const sourcePath = resolveExpoFrameworkSourcePath(
      projectRoot,
      frameworkName
    );
    if (!fs.existsSync(sourcePath)) {
      throw new RockError(
        `Expected Expo SDK ${MIN_EXPO_SDK_MAJOR_FOR_SUPPORT_XCFRAMEWORKS}+ XCFramework not found: ${frameworkName}.xcframework at ${path.relative(projectRoot, sourcePath)}`
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
