#if canImport(Expo)
import UIKit
internal import React
internal import ReactAppDependencyProvider

internal import Expo
#if canImport(EXUpdates)
internal import EXUpdates
#endif

final class ExpoHostRuntime {
  static let shared = ExpoHostRuntime()

  let preloadState = ReactHostPreloadState()
  private var delegate = ExpoHostRuntimeDelegate()
  private var reactNativeFactory: RCTReactNativeFactory?
  private var expoDelegate: ExpoAppDelegate?
  #if canImport(EXUpdates)
  private let updatesStartup = ExpoUpdatesStartup()
  #endif

  func prepareReactNative(_ completion: @escaping () -> Void) {
    #if canImport(EXUpdates)
    updatesStartup.prepareReactNative(completion)
    #else
    completion()
    #endif
  }

  private func configureDevLoadingView(with bundleURL: URL? = nil) {
    #if DEBUG
    let resolvedBundleURL = bundleURL ?? delegate.bundleURL()
    let shouldDisableDevLoadingView =
      preferEmbeddedBundleInDebug && (resolvedBundleURL?.isFileURL ?? false)

    BrownfieldDevLoadingViewBridge.setEnabled(!shouldDisableDevLoadingView)
    #endif
  }

  /**
   * Starts React Native with default parameters.
   */
  public func startReactNative() {
    startReactNative(onBundleLoaded: nil)
  }
  /**
   * Starts React Native with optional callback when bundle is loaded.
   *
   * @param onBundleLoaded Optional callback invoked on the main thread after JS bundle is fully loaded.
   */
  public func startReactNative(onBundleLoaded: ((JSBundleTimings) -> Void)?) {
    // The callback registration is outside of the guard below. An earlier `startReactNative` call
    // can already have made the factory, and the callback must still run.
    if let onBundleLoaded {
      preloadState.jsBundleLoadObserver.observe(onBundleLoaded: onBundleLoaded)
    }

    guard reactNativeFactory == nil else { return }

    let appDelegate = ExpoAppDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeFactory = ExpoReactNativeFactory(delegate: delegate)
    // below: https://github.com/expo/expo/pull/39418/changes/5abd332b55b2ee7daee848284ed5f7fe1639452e
    // has removed bindReactNativeFactory method from ExpoAppDelegate
    #if !EXPO_SDK_GTE_55  // this define comes from the Brownfield Expo config plugin
    guard let reactNativeFactory else { return }
    appDelegate.bindReactNativeFactory(reactNativeFactory)
    #endif
    expoDelegate = appDelegate
  }

  /**
   * Stops React Native and releases the underlying factory instance.
   */
  public func stopReactNative() {
    if !Thread.isMainThread {
      DispatchQueue.main.async { [weak self] in self?.stopReactNative() }
      return
    }

    if let rootViewFactory = reactNativeFactory?.rootViewFactory {
        (rootViewFactory as AnyObject).setValue(nil, forKey: "reactHost")
    }
    reactNativeFactory = nil
    expoDelegate = nil
    preloadState.reset()
    #if canImport(EXUpdates)
    updatesStartup.cancelPendingRequests()
    #endif
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
   * Use the embedded JavaScript bundle as a Debug fallback when Metro is unavailable.
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

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    #if canImport(EXUpdates)
    if !AppController.isInitialized() {
      AppController.initializeWithoutStarting()
    }
    #endif
    return ExpoAppDelegateSubscriberManager.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API; base implementation courtesy of Expo, licensed under the MIT License - changes were made to call the method on expo delegate - https://github.com/expo/expo/blob/main/apps/bare-expo/ios/AppDelegate.swift
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return (expoDelegate?.application(app, open: url, options: options) ?? false) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links; base implementation courtesy of Expo, licensed under the MIT License - changes were made to call the method on expo delegate - https://github.com/expo/expo/blob/main/apps/bare-expo/ios/AppDelegate.swift
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return (expoDelegate?.application(application, continue: userActivity, restorationHandler: restorationHandler) ?? false) || result
  }

  func application(
    _ application: UIApplication,
    willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    return ExpoAppDelegateSubscriberManager.application(application, willFinishLaunchingWithOptions: launchOptions)
  }

  func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]?
  ) -> UIView? {
    // Return a container while Updates selects its launch asset. This also supports the
    // public view API, which does not go through ReactNativeViewController.
    let container = UIView()
    var immediateView: UIView?
    var preparing = true
    prepareReactNative { [weak self, weak container] in
      guard let self, preparing || container != nil else { return }
      let root = self.createView(moduleName: moduleName, initialProps: initialProps,
                                 launchOptions: launchOptions)
      if preparing {
        immediateView = root
      } else if let container, let root {
        root.frame = container.bounds
        root.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(root)
      }
    }
    preparing = false
    return immediateView ?? container
  }

  private func createView(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]?
  ) -> UIView? {
    startReactNative()
    let bundleURL = delegate.bundleURL()
    configureDevLoadingView(with: bundleURL)

    let resolvedLaunchOptions = preloadState.launchOptions(overriddenBy: launchOptions)

    // below: https://github.com/expo/expo/commit/2013760c46cde1404872d181a691da72fbf207a4
    // has moved the recreateRootView method to ExpoReactNativeFactory
    #if EXPO_SDK_GTE_55  // this define comes from the Brownfield Expo config plugin
    return (reactNativeFactory as? ExpoReactNativeFactory)?.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: resolvedLaunchOptions
    )
    #else
    return expoDelegate?.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: resolvedLaunchOptions
    )
    #endif
  }
}

extension ExpoHostRuntime: ReactHostPreloading {
  var reactNativeFactoryForPreload: AnyObject? {
    return reactNativeFactory
  }

  /**
   * expo-dev-launcher finds the Metro URL only after the user selects an app in the launcher. This
   * is a Debug behavior. Packaged apps opting into an embedded bundle or an explicit URL
   * can preload without the launcher. In Release the launcher does nothing.
   *
   * The check reads the class name, because this pod has no dependency on expo-dev-launcher.
   * `EXDevLauncherController` is the name in expo-dev-launcher 56 and 57. If a later version
   * changes the name, this method gives `true`, and a preload can keep a bundle of the launcher
   * screen. Examine the name again when you add a new Expo SDK.
   *
   * `ExpoHostRuntimeDelegate.isBundleURLStable` covers the other conditions.
   */
  func canPreloadReactNative() -> Bool {
    #if DEBUG
    if !preferEmbeddedBundleInDebug && bundleURLOverride?() == nil,
      NSClassFromString("EXDevLauncherController") != nil {
      return false
    }
    #endif

    return delegate.isBundleURLStable
  }

  func prepareDevLoadingView() {
    configureDevLoadingView()
  }
}

class ExpoHostRuntimeDelegate: ExpoReactNativeFactoryDelegate {
  var entryFile = ".expo/.virtual-metro-entry"
  var bundlePath = "main.jsbundle"
  var bundle = Bundle.main
  var preferEmbeddedBundleInDebug = false
  var bundleURLOverride: (() -> URL?)? = nil

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
    do {
      #if DEBUG
      let isDebug = true
      #else
      let isDebug = false
      #endif

      if let overriddenURL = bundleURLOverride?() {
        return overriddenURL
      }

      #if canImport(EXUpdates)
      if AppController.isInitialized(),
        AppController.sharedInstance.isActiveController,
        let launchAssetURL = AppController.sharedInstance.launchAssetUrl()
      {
        return launchAssetURL
      }
      #endif

      // The override is resolved here so it wins over the Expo Updates launch asset
      // and the closure is not evaluated a second time inside the shared resolver.
      return try BrownfieldBundleURLResolver.resolve(
        isDebug: isDebug,
        preferEmbeddedBundleInDebug: preferEmbeddedBundleInDebug,
        bundlePath: bundlePath,
        bundle: bundle,
        bundleURLOverride: nil,
        metroURL: {
          RCTBundleURLProvider.sharedSettings().jsBundleURL(
            forBundleRoot: entryFile,
            fallbackURLProvider: { nil }
          )
        }
      )
    } catch {
      assertionFailure("Invalid bundlePath '\(bundlePath)': \(error)")
      return nil
    }
  }

  /**
   * `true` if `bundleURL()` gives now the same result as a later resolution. This property follows
   * the steps of `bundleURL()`, and it must change together with them.
   *
   * The override wins over every other step, thus an override makes the URL stable.
   *
   * The shared runtime waits for Updates before preloading or creating views. Inactive
   * controllers use the normal bundle resolver and do not need an Updates launch asset.
   */
  var isBundleURLStable: Bool {
    if bundleURLOverride?() != nil {
      return true
    }

    #if canImport(EXUpdates)
    guard AppController.isInitialized() else { return false }
    return !AppController.sharedInstance.isActiveController
      || AppController.sharedInstance.launchAssetUrl() != nil
    #else
    return true
    #endif
  }
}
#endif
