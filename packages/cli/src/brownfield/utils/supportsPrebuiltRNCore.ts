import { getReactNativeVersion, versionCompare } from '@rock-js/tools';

/** Minimum RN version that can opt in to prebuilts via `--use-prebuilt-rn-core`. */
export const MIN_REACT_NATIVE_VERSION_FOR_OPT_IN_PREBUILT_RN_CORE = '0.81.0';
/** Minimum RN version where Brownfield enables prebuilts by default (vanilla projects). */
export const MIN_REACT_NATIVE_VERSION_FOR_PREBUILT_RN_CORE_BY_DEFAULT =
  '0.84.0';
export type PrebuiltRNCoreSupportResult =
  | { supported: true; enabledByDefault: boolean; reason?: never }
  | { supported: false; enabledByDefault?: never; reason: string };

export function supportsPrebuiltRNCore({
  projectRoot,
}: {
  projectRoot: string;
}): PrebuiltRNCoreSupportResult {
  const reactNativeVersion = getReactNativeVersion(projectRoot);

  if (reactNativeVersion === 'unknown') {
    return {
      supported: false,
      reason:
        'Cannot use --use-prebuilt-rn-core: unable to resolve the installed react-native version.',
    };
  }

  if (
    versionCompare(
      reactNativeVersion,
      MIN_REACT_NATIVE_VERSION_FOR_OPT_IN_PREBUILT_RN_CORE
    ) < 0
  ) {
    return {
      supported: false,
      reason: `--use-prebuilt-rn-core requires React Native ${MIN_REACT_NATIVE_VERSION_FOR_OPT_IN_PREBUILT_RN_CORE} or newer (found ${reactNativeVersion}).`,
    };
  }

  const enabledByDefault =
    versionCompare(
      reactNativeVersion,
      MIN_REACT_NATIVE_VERSION_FOR_PREBUILT_RN_CORE_BY_DEFAULT
    ) >= 0;

  return { supported: true, enabledByDefault };
}
