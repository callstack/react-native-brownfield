const EMBEDDED_BUNDLE_MARKER =
  '// @callstack/react-native-brownfield: Detox embedded bundle in Debug';

function patchAppDelegateContents(contents: string): string {
  if (contents.includes(EMBEDDED_BUNDLE_MARKER)) {
    return contents;
  }

  const debugMetroReturn =
    /(#if DEBUG\r?\n\s*)return RCTBundleURLProvider\.sharedSettings\(\)\.jsBundleURL\(forBundleRoot: "([^"]+)"\)/;

  if (!debugMetroReturn.test(contents)) {
    return contents;
  }

  return contents.replace(
    debugMetroReturn,
    `$1${EMBEDDED_BUNDLE_MARKER}
    if ProcessInfo.processInfo.arguments.contains("-BrownfieldPreferEmbeddedBundleInDebug"),
       let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return embedded
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "$2")`
  );
}

describe('withDetoxEmbeddedBundleIosAppDelegate', () => {
  it('injects embedded bundle fallback before Metro in Debug', () => {
    const input = `class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}`;

    const output = patchAppDelegateContents(input);

    expect(output).toContain(EMBEDDED_BUNDLE_MARKER);
    expect(output).toContain('-BrownfieldPreferEmbeddedBundleInDebug');
    expect(output).toContain(
      'return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")'
    );
  });

  it('is idempotent', () => {
    const once = patchAppDelegateContents(`#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")`);
    const twice = patchAppDelegateContents(once);
    expect(twice).toBe(once);
  });
});
