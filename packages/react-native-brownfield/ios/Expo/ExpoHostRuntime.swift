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
  public func startReactNative(onBundleLoaded: (() -> Void)?) {
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
   * is a Debug behavior. In Release the class is in the binary, but it does nothing. Thus this
   * check is also only in Debug.
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
    if NSClassFromString("EXDevLauncherController") != nil {
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
      if !isDebug,
        AppController.isInitialized(),
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
   * expo-updates selects the launch asset while `AppController` starts. `ReactNativeViewController`
   * starts `AppController`. Before this operation is complete, `launchAssetUrl()` is nil, and
   * `bundleURL()` gives the embedded bundle. A host from that time keeps the embedded bundle, and
   * Expo never applies the update. Thus the URL is stable only after `launchAssetUrl()` has a
   * value. The class can be in the binary while the app does not use it, thus this check reads the
   * state and not the class.
   */
  var isBundleURLStable: Bool {
    if bundleURLOverride?() != nil {
      return true
    }

    #if canImport(EXUpdates) && !DEBUG
    return AppController.isInitialized() && AppController.sharedInstance.launchAssetUrl() != nil
    #else
    return true
    #endif
  }
}
#endif
