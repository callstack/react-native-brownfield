import UIKit
internal import React
internal import React_RCTAppDelegate
internal import ReactAppDependencyProvider

#if canImport(Expo)
internal import Expo
#if canImport(EXUpdates)
internal import EXUpdates
#endif

final class ExpoHostRuntime {
  static let shared = ExpoHostRuntime()

  private let jsBundleLoadObserver = JSBundleLoadObserver()
  private var delegate = ExpoHostRuntimeDelegate()
  private var reactNativeFactory: RCTReactNativeFactory?
  private var expoDelegate: ExpoAppDelegate?

  #if canImport(EXUpdates)
  private var updatesController: InternalAppControllerInterface?
  private var didStartUpdatesController = false
  #endif

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

  public func initializeExpoUpdates() {
    print("== initializeExpoUpdates")
    #if canImport(EXUpdates)
    initializeUpdatesControllerIfNeeded()
    #endif
  }

  #if canImport(EXUpdates)
  private func initializeUpdatesControllerIfNeeded() {
    // if !AppController.isInitialized() {
    //   AppController.initializeWithoutStarting()
    
//    updatesController = AppController.sharedInstance
//    if !didStartUpdatesController {
//      didStartUpdatesController = true
//      updatesController?.start()
//    }
      AppController.sharedInstance.start()
  }
  #endif

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
    print("== application didFinishLaunchingWithOptions")
    #if canImport(EXUpdates)
    if !AppController.isInitialized() {
      AppController.initializeWithoutStarting()
    }
      
      AppController.sharedInstance.start()
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
    
    func applicationDidBecomeActive(_ application: UIApplication) {
      ExpoAppDelegateSubscriberManager.applicationDidBecomeActive(application)
    }

    func applicationWillResignActive(_ application: UIApplication) {
      ExpoAppDelegateSubscriberManager.applicationWillResignActive(application)
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
      ExpoAppDelegateSubscriberManager.applicationDidEnterBackground(application)
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
      ExpoAppDelegateSubscriberManager.applicationWillEnterForeground(application)
    }

   func applicationWillTerminate(_ application: UIApplication) {
      ExpoAppDelegateSubscriberManager.applicationWillTerminate(application)
    }
    
    func applicationDidReceiveMemoryWarning(_ application: UIApplication) {
      ExpoAppDelegateSubscriberManager.applicationDidReceiveMemoryWarning(application)
    }
    
    func application(
      _ application: UIApplication,
      handleEventsForBackgroundURLSession identifier: String,
      completionHandler: @escaping () -> Void
    ) {
      ExpoAppDelegateSubscriberManager.application(application, handleEventsForBackgroundURLSession: identifier, completionHandler: completionHandler)
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      ExpoAppDelegateSubscriberManager.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
      ExpoAppDelegateSubscriberManager.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    }
    
    func application(
      _ application: UIApplication,
      didReceiveRemoteNotification userInfo: [AnyHashable: Any],
      fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
      ExpoAppDelegateSubscriberManager.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    }
    
    func application(
      _ application: UIApplication,
      performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
      ExpoAppDelegateSubscriberManager.application(application, performFetchWithCompletionHandler: completionHandler)
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
      return (reactNativeFactory as? ExpoReactNativeFactory)?.recreateRootView(
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
      print("=== expo isDebug")
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(
      forBundleRoot: entryFile)
#else
    #if canImport(EXUpdates)
      print("=== expo launch asset URL -- \(AppController.sharedInstance.launchAssetUrl())")
    if AppController.isInitialized(),
       let launchAssetURL = AppController.sharedInstance.launchAssetUrl() {
      return launchAssetURL
    }
    #endif
    do {
        print("=== expo release")
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
