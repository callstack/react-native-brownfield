import UIKit
internal import React
internal import React_RCTAppDelegate
internal import ReactAppDependencyProvider

class ReactNativeBrownfieldDelegate: RCTDefaultReactNativeFactoryDelegate {
  var entryFile = "index"
  var bundlePath = "main.jsbundle"
  var bundle = Bundle.main
  var bundleURLOverride: (() -> URL?)? = nil
  // MARK: - RCTReactNativeFactoryDelegate Methods

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bundleURL()
  }

  public override func bundleURL() -> URL? {
    if let bundleURLProvider = bundleURLOverride {
      return bundleURLProvider()
    }

#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: entryFile)
#else
    let (resourceName, fileExtension) = BrownfieldBundlePathResolver.resourceComponents(
      from: bundlePath
    )

    return bundle.url(forResource: resourceName, withExtension: fileExtension)
#endif
  }
}

final class ReactNativeHostRuntime: NSObject {
  public static let shared = ReactNativeHostRuntime()
  private var onBundleLoaded: (() -> Void)?
  private var delegate = ReactNativeBrownfieldDelegate()

  /**
   * Path to JavaScript root.
   * Default value: "index"
   */
  public var entryFile: String = "index" {
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
  /**
   * React Native factory instance created when starting React Native.
   * Default value: nil
   */
  private var reactNativeFactory: RCTReactNativeFactory? = nil
  /**
   * Root view factory used to create React Native views.
   */
  lazy private var rootViewFactory: RCTRootViewFactory? = {
    return reactNativeFactory?.rootViewFactory
  }()

  /**
   * Starts React Native with default parameters.
   */
  public func startReactNative() {
    startReactNative(onBundleLoaded: nil)
  }

  public func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]? = nil
  ) -> UIView? {
    rootViewFactory?.view(
      withModuleName: moduleName,
      initialProperties: initialProps,
      launchOptions: launchOptions
    )
  }

  /**
   * Mirrors host manager app delegate API for bare React Native.
   */
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    return true
  }

  /**
   * Starts React Native with optional callback when bundle is loaded.
   *
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   */
  public func startReactNative(onBundleLoaded: (() -> Void)?) {
    guard reactNativeFactory == nil else { return }

    delegate.dependencyProvider = RCTAppDependencyProvider()
    self.reactNativeFactory = RCTReactNativeFactory(delegate: delegate)

    if let onBundleLoaded {
      self.onBundleLoaded = onBundleLoaded
      if RCTIsNewArchEnabled() {
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(jsLoaded),
          name: NSNotification.Name("RCTInstanceDidLoadBundle"),
          object: nil
        )
      } else {
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(jsLoaded),
          name: NSNotification.Name("RCTJavaScriptDidLoadNotification"),
          object: nil
        )
      }
    }
  }

  @objc private func jsLoaded(_ notification: Notification) {
    onBundleLoaded?()
    onBundleLoaded = nil
    NotificationCenter.default.removeObserver(self)
  }
}
