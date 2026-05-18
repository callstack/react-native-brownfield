import UIKit
internal import React
internal import React_RCTAppDelegate
internal import ReactAppDependencyProvider

class ReactNativeBrownfieldDelegate: RCTDefaultReactNativeFactoryDelegate {
  var entryFile = "index"
  var bundlePath = "main.jsbundle"
  var bundle = Bundle.main
  var preferEmbeddedBundleInDebug = false
  var bundleURLOverride: (() -> URL?)? = nil
  // MARK: - RCTReactNativeFactoryDelegate Methods

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bundleURL()
  }

  public override func bundleURL() -> URL? {
    do {
      #if DEBUG
      let isDebug = true
      #else
      let isDebug = false
      #endif

      return try BrownfieldBundleURLResolver.resolve(
        isDebug: isDebug,
        preferEmbeddedBundleInDebug: preferEmbeddedBundleInDebug,
        bundlePath: bundlePath,
        bundle: bundle,
        bundleURLOverride: bundleURLOverride,
        metroURL: {
          RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: entryFile)
        }
      )
    } catch {
      assertionFailure("Invalid bundlePath '\(bundlePath)': \(error)")
      return nil
    }
  }
}

final class ReactNativeHostRuntime {
  public static let shared = ReactNativeHostRuntime()
  private let jsBundleLoadObserver = JSBundleLoadObserver()
  private var delegate = ReactNativeBrownfieldDelegate()

  private func configureDevLoadingView() {
    #if DEBUG
    let shouldDisableDevLoadingView =
      preferEmbeddedBundleInDebug && (delegate.bundleURL()?.isFileURL ?? false)

    BrownfieldDevLoadingViewBridge.setEnabled(!shouldDisableDevLoadingView)
    #endif
  }

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
   * Prefer the embedded JavaScript bundle instead of Metro when this framework is built in Debug.
   * Default value: false
   */
  public var preferEmbeddedBundleInDebug: Bool = false {
    didSet {
      delegate.preferEmbeddedBundleInDebug = preferEmbeddedBundleInDebug
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
   * Starts React Native with default parameters.
   */
  public func startReactNative() {
    startReactNative(onBundleLoaded: nil)
  }

  /**
   * Stops React Native and releases the underlying factory instance.
   */
  public func stopReactNative() {
    if !Thread.isMainThread {
      DispatchQueue.main.async { [weak self] in self?.stopReactNative() }
      return
    }

    reactNativeFactory = nil
  }

  public func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]? = nil
  ) -> UIView? {
    configureDevLoadingView()

    return reactNativeFactory?.rootViewFactory.view(
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
   * Mirrors host manager app delegate API for bare React Native.
   */
  public func application(
    _ application: UIApplication,
    willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    return true
  }

  public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }

  /**
   * Starts React Native with optional callback when bundle is loaded.
   *
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   */
  public func startReactNative(onBundleLoaded: (() -> Void)?) {
    guard reactNativeFactory == nil else { return }

    configureDevLoadingView()

    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = RCTReactNativeFactory(delegate: delegate)

    if let onBundleLoaded {
      jsBundleLoadObserver.observeOnce(onBundleLoaded: onBundleLoaded)
    }
  }
}
