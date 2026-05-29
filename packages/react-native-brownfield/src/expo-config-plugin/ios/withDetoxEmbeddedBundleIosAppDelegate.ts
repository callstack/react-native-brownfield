import { withAppDelegate, type ConfigPlugin } from '@expo/config-plugins';

const EMBEDDED_BUNDLE_MARKER =
  '// @callstack/react-native-brownfield: Detox embedded bundle in Debug';

/**
 * Allows Detox / CI to load the embedded JS bundle in Debug when launch args include
 * `-BrownfieldPreferEmbeddedBundleInDebug` (paired with FORCE_BUNDLING=1 at build time).
 */
export const withDetoxEmbeddedBundleIosAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (configWithMods) => {
    const { modResults } = configWithMods;

    if (modResults.language !== 'swift') {
      return configWithMods;
    }

    let { contents } = modResults;

    if (contents.includes(EMBEDDED_BUNDLE_MARKER)) {
      return configWithMods;
    }

    const debugMetroReturn =
      /(#if DEBUG\r?\n\s*)return RCTBundleURLProvider\.sharedSettings\(\)\.jsBundleURL\(forBundleRoot: "([^"]+)"\)/;

    if (!debugMetroReturn.test(contents)) {
      return configWithMods;
    }

    contents = contents.replace(
      debugMetroReturn,
      `$1${EMBEDDED_BUNDLE_MARKER}
    if ProcessInfo.processInfo.arguments.contains("-BrownfieldPreferEmbeddedBundleInDebug"),
       let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return embedded
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "$2")`
    );

    modResults.contents = contents;
    return configWithMods;
  });
};
