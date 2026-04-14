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

  private var factory: RCTReactNativeFactory {
    if let existingFactory = reactNativeFactory {
      return existingFactory
    }

    delegate.dependencyProvider = RCTAppDependencyProvider()
    let createdFactory = ExpoReactNativeFactory(delegate: delegate)
    reactNativeFactory = createdFactory
    return createdFactory
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
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   */
  public func startReactNative(onBundleLoaded: (() -> Void)?) {
    guard reactNativeFactory == nil else { return }

    let appDelegate = ExpoAppDelegate()
    // below: https://github.com/expo/expo/pull/39418/changes/5abd332b55b2ee7daee848284ed5f7fe1639452e
    // has removed bindReactNativeFactory method from ExpoAppDelegate
    #if !EXPO_SDK_GTE_55 // this define comes from the Brownfield Expo config plugin
      appDelegate.bindReactNativeFactory(factory)
    #endif
    expoDelegate = appDelegate

    if let onBundleLoaded {
      jsBundleLoadObserver.observeOnce(onBundleLoaded: onBundleLoaded)
    }
  }

  /**
   * Stops React Native and releases the underlying factory instance.
   */
  public func stopReactNative() {
    if !Thread.isMainThread {
      DispatchQueue.main.async { [weak self] in self?.stopReactNative() }
      return
    }

    #if !EXPO_SDK_GTE_55 
    guard let factory = reactNativeFactory else { return }
    factory.bridge?.invalidate()
    #endif

    reactNativeFactory = nil
    expoDelegate = nil
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

  func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]?
  ) -> UIView? {
    let bundleURL = delegate.bundleURL()

    // below: https://github.com/expo/expo/commit/2013760c46cde1404872d181a691da72fbf207a4
    // has moved the recreateRootView method to ExpoReactNativeFactory
    #if EXPO_SDK_GTE_55 // this define comes from the Brownfield Expo config plugin
    return (factory as? ExpoReactNativeFactory)?.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: launchOptions
    )
    #else
    return expoDelegate?.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: launchOptions
    )
    #endif
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
    do {
      let (resourceName, fileExtension) = try BrownfieldBundlePathResolver.resourceComponents(
        from: bundlePath
      )
      return bundle.url(forResource: resourceName, withExtension: fileExtension)
    } catch {
      assertionFailure("Invalid bundlePath '\(bundlePath)': \(error)")
      return nil
    }
#endif
  }
}
#endif
