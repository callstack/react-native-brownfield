import { getExpoSdkMajor, isExpoProject } from './project.js';

export const MIN_EXPO_SDK_MAJOR_FOR_PREBUILT_EXPO = 56;

export type PrebuiltExpoSupportResult =
  | { supported: true; enabledByDefault: boolean; reason?: never }
  | { supported: false; enabledByDefault?: never; reason: string };

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

  return {
    supported: true,
    enabledByDefault: true,
  };
}
