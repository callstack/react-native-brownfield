import UIKit
internal import React
internal import React_RCTAppDelegate
internal import ReactAppDependencyProvider

#if canImport(Expo)
internal import Expo

final class ExpoHostRuntime {
  static let shared = ExpoHostRuntime()

  private let jsBundleLoadObserver = JSBundleLoadObserver()
  private var delegate = ExpoHostRuntimeDelegate()
  private var reactNativeFactory: RCTReactNativeFactory?
  private var expoDelegate: ExpoAppDelegate?

  /**
   * Starts React Native with default parameters.
   */
  public func startReactNative() {
    startReactNative(onBundleLoaded: nil)
  }
  /**
   * Starts React Native with optional callback when bundle is loaded.
   *
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   */
  public func startReactNative(onBundleLoaded: (() -> Void)?) {
    guard reactNativeFactory == nil else { return }

    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeFactory = factory

    let appDelegate = ExpoAppDelegate()
    appDelegate.bindReactNativeFactory(factory)
    expoDelegate = appDelegate

    if let onBundleLoaded {
      jsBundleLoadObserver.observeOnce(onBundleLoaded: onBundleLoaded)
    }
  }

  /**
   * Path to JavaScript root.
   * Default value: ".expo/.virtual-metro-entry"
   */
  public var entryFile: String = ".expo/.virtual-metro-entry" {
    didSet {
      delegate.entryFile = entryFile
    }
  }

  /**
   * Path to JavaScript bundle file.
   * Default value: "main.jsbundle"
   */
  public var bundlePath: String = "main.jsbundle" {
    didSet {
      delegate.bundlePath = bundlePath
    }
  }
  /**
   * Bundle instance to lookup the JavaScript bundle.
   * Default value: Bundle.main
   */
  public var bundle: Bundle = Bundle.main {
    didSet {
      delegate.bundle = bundle
    }
  }
  /**
   * Dynamic bundle URL provider called on every bundle load.
   * When set, this overrides the default bundleURL() behavior in the delegate.
   * Returns a URL to load a custom bundle, or nil to use default behavior.
   * Default value: nil
   */
  public var bundleURLOverride: (() -> URL?)? = nil {
    didSet {
      delegate.bundleURLOverride = bundleURLOverride
    }
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    return expoDelegate?.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    ) != nil
  }

  func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]?
  ) -> UIView? {
    let bundleURL = delegate.bundleURL()

    return expoDelegate?.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: launchOptions
    )
  }
}

class ExpoHostRuntimeDelegate: ExpoReactNativeFactoryDelegate {
  var entryFile = ".expo/.virtual-metro-entry"
  var bundlePath = "main.jsbundle"
  var bundle = Bundle.main
  var bundleURLOverride: (() -> URL?)? = nil

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
    if let bundleURLProvider = bundleURLOverride { return bundleURLProvider() }
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(
      forBundleRoot: entryFile)
#else
    let (resourceName, fileExtension) = BrownfieldBundlePathResolver.resourceComponents(
      from: bundlePath
    )

    return bundle.url(forResource: resourceName, withExtension: fileExtension)
#endif
  }
}
#endif
