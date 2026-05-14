import {
  getReactNativeVersion,
  RockError,
  versionCompare,
} from '@rock-js/tools';

import { getExpoSdkMajor, isExpoProject } from './project.js';

export const MIN_REACT_NATIVE_VERSION_FOR_USE_PREBUILT_RN_CORE = '0.81.0';
export const MIN_EXPO_SDK_MAJOR_FOR_USE_PREBUILT_RN_CORE = 55;

export function assertUsePrebuiltRnCoreSupported({
  projectRoot,
}: {
  projectRoot: string;
}): void {
  const reactNativeVersion = getReactNativeVersion(projectRoot);

  if (reactNativeVersion === 'unknown') {
    throw new RockError(
      'Cannot use --use-prebuilt-rn-core: unable to resolve the installed react-native version.'
    );
  }

  if (
    versionCompare(
      reactNativeVersion,
      MIN_REACT_NATIVE_VERSION_FOR_USE_PREBUILT_RN_CORE
    ) < 0
  ) {
    throw new RockError(
      `--use-prebuilt-rn-core requires React Native ${MIN_REACT_NATIVE_VERSION_FOR_USE_PREBUILT_RN_CORE} or newer (found ${reactNativeVersion}).`
    );
  }

  if (isExpoProject(projectRoot)) {
    const expoSdkMajor = getExpoSdkMajor(projectRoot);

    if (
      expoSdkMajor === null ||
      expoSdkMajor < MIN_EXPO_SDK_MAJOR_FOR_USE_PREBUILT_RN_CORE
    ) {
      const sdkLabel = expoSdkMajor === null ? 'unknown' : String(expoSdkMajor);
      throw new RockError(
        `--use-prebuilt-rn-core requires Expo SDK ${MIN_EXPO_SDK_MAJOR_FOR_USE_PREBUILT_RN_CORE} or newer (found SDK ${sdkLabel}).`
      );
    }
  }
}
