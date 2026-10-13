import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { getReactNativeVersion } from '@rock-js/tools';

import { getExpoSdkMajor, isExpoProject } from './project.js';

export const MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO = 56;

export type PrebuiltExpoSupportResult =
  | {
      supported: true;
      enabledByDefault: boolean;
      /** Why prebuilts are off by default even though they are supported. */
      defaultDisabledReason?: string;
      reason?: never;
    }
  | { supported: false; enabledByDefault?: never; reason: string };

function majorMinor(version: string): string {
  return version.split('.').slice(0, 2).join('.');
}

/**
 * The React Native version the installed Expo SDK pins. Expo ships its
 * precompiled modules built against this version.
 */
export function getExpoReactNativeVersion(projectRoot: string): string | null {
  try {
    const require = createRequire(path.join(projectRoot, 'package.json'));
    const expoPackageJson = require.resolve('expo/package.json');
    const bundledNativeModules = JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(expoPackageJson), 'bundledNativeModules.json'),
        'utf8'
      )
    ) as Record<string, string>;
    return bundledNativeModules['react-native'] ?? null;
  } catch {
    return null;
  }
}

/**
 * Describes a React Native version the Expo prebuilts were not built for, or
 * returns null when they match. Prebuilt Expo modules link against React
 * Native's C++ API, which changes between minor versions, so a mismatch
 * crashes at runtime.
 */
export function getPrebuiltExpoReactNativeMismatch(
  projectRoot: string
): string | null {
  const expected = getExpoReactNativeVersion(projectRoot);
  const found = getReactNativeVersion(projectRoot);
  if (!expected || found === 'unknown') {
    return null;
  }

  if (majorMinor(expected) === majorMinor(found)) {
    return null;
  }

  return `Expo's precompiled modules are built for React Native ${majorMinor(expected)}, but this project uses ${found}.`;
}

export function supportsPrebuiltExpo({
  projectRoot,
}: {
  projectRoot: string;
}): PrebuiltExpoSupportResult {
  if (!isExpoProject(projectRoot)) {
    return { supported: true, enabledByDefault: false };
  }

  const expoSdkMajor = getExpoSdkMajor(projectRoot);
  if (
    expoSdkMajor === null ||
    expoSdkMajor < MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO
  ) {
    const sdkLabel = expoSdkMajor === null ? 'unknown' : String(expoSdkMajor);
    return {
      supported: false,
      reason: `--use-prebuilt-expo is unsupported in Expo SDK ${sdkLabel}: packaging brownfield with Expo prebuilts requires Expo SDK ${MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO} or newer.`,
    };
  }

  const reactNativeMismatch = getPrebuiltExpoReactNativeMismatch(projectRoot);
  if (reactNativeMismatch) {
    return {
      supported: true,
      enabledByDefault: false,
      defaultDisabledReason: reactNativeMismatch,
    };
  }

  return {
    supported: true,
    enabledByDefault: true,
  };
}
