import UIKit

#if canImport(Expo)
internal import Expo
#endif

@objc public class ReactNativeBrownfield: NSObject {
  public static let shared = ReactNativeBrownfield()

  /**
   * Path to JavaScript root.
   * Default value: "index"
   */
  @objc public var entryFile: String = {
    #if canImport(Expo)
    return ".expo/.virtual-metro-entry"
    #else
    return "index"
    #endif
  }() {
    didSet {
      #if canImport(Expo)
      ExpoHostRuntime.shared.entryFile = entryFile
      #else
      ReactNativeHostRuntime.shared.entryFile = entryFile
      #endif
    }
  }

  /**
   * Path to JavaScript bundle file.
   * Default value: "main.jsbundle"
   */
  @objc public var bundlePath: String = "main.jsbundle" {
    didSet {
      #if canImport(Expo)
      ExpoHostRuntime.shared.bundlePath = bundlePath
      #else
      ReactNativeHostRuntime.shared.bundlePath = bundlePath
      #endif
    }
  }

  /**
   * Bundle instance to lookup the JavaScript bundle.
   * Default value: Bundle.main
   */
  @objc public var bundle: Bundle = .main {
    didSet {
      #if canImport(Expo)
      ExpoHostRuntime.shared.bundle = bundle
      #else
      ReactNativeHostRuntime.shared.bundle = bundle
      #endif
    }
  }

  /**
   * Dynamic bundle URL provider called on every bundle load.
   * When set, this overrides the default bundleURL() behavior in the delegate.
   * Returns a URL to load a custom bundle, or nil to use default behavior.
   * Default value: nil
   */
  @objc public var bundleURLOverride: (() -> URL?)? {
    didSet {
      #if canImport(Expo)
      ExpoHostRuntime.shared.bundleURLOverride = bundleURLOverride
      #else
      ReactNativeHostRuntime.shared.bundleURLOverride = bundleURLOverride
      #endif
    }
  }

  /**
   * Starts React Native with default parameters.
   */
  @objc public func startReactNative() {
    #if canImport(Expo)
    ExpoHostRuntime.shared.startReactNative()
    #else
    ReactNativeHostRuntime.shared.startReactNative()
    #endif
  }

  @objc public func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]? = nil
  ) -> UIView? {
    #if canImport(Expo)
    ExpoHostRuntime.shared.view(
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: launchOptions
    )
    #else
    ReactNativeHostRuntime.shared.view(
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: launchOptions
    )
    #endif
  }

  /**
   * Mirrors host manager app delegate API for bare React Native.
   */
  @objc public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    #if canImport(Expo)
    return ExpoHostRuntime.shared.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
    #else
    return ReactNativeHostRuntime.shared.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
    #endif
  }

  /**
   * Starts React Native with optional callback when bundle is loaded.
   *
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   */
  @objc public func startReactNative(onBundleLoaded: (() -> Void)?) {
    #if canImport(Expo)
    ExpoHostRuntime.shared.startReactNative(onBundleLoaded: onBundleLoaded)
    #else
    ReactNativeHostRuntime.shared.startReactNative(onBundleLoaded: onBundleLoaded)
    #endif
  }
}
