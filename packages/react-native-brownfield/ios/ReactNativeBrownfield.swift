import UIKit

#if canImport(Expo)
internal import Expo
#endif

@objc public class ReactNativeBrownfield: NSObject {
  public static let shared = ReactNativeBrownfield()

  /**
   * Path to JavaScript root.
   * Default value: "index" for bare React Native, ".expo/.virtual-metro-entry" when built with Expo.
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
  @objc public var bundleURLOverride: (() -> URL?)? = nil {
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
   * Mirrors the host runtime app delegate API, forwarding to Expo or bare React Native as appropriate.
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
     * Mirrors the host runtime app delegate API, forwarding to Expo or bare React Native as appropriate.
     */
    @objc public func application(
      _ application: UIApplication,
      willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
      #if canImport(Expo)
      return ExpoHostRuntime.shared.application(
        application,
        willFinishLaunchingWithOptions: launchOptions
      )
      #else
      return ReactNativeHostRuntime.shared.application(
        application,
        willFinishLaunchingWithOptions: launchOptions
      )
      #endif
    }
    
    @objc public func applicationDidBecomeActive(_ application: UIApplication) {
        ExpoHostRuntime.shared.applicationDidBecomeActive(application)
    }

    @objc public func applicationWillResignActive(_ application: UIApplication) {
        ExpoHostRuntime.shared.applicationWillResignActive(application)
    }

    @objc public func applicationDidEnterBackground(_ application: UIApplication) {
        ExpoHostRuntime.shared.applicationDidEnterBackground(application)
    }

    @objc public  func applicationWillEnterForeground(_ application: UIApplication) {
        ExpoHostRuntime.shared.applicationWillEnterForeground(application)
    }

    @objc public func applicationWillTerminate(_ application: UIApplication) {
        ExpoHostRuntime.shared.applicationWillTerminate(application)
    }
    
    @objc public func applicationDidReceiveMemoryWarning(_ application: UIApplication) {
        ExpoHostRuntime.shared.applicationDidReceiveMemoryWarning(application)
    }
    
    @objc public func application(
      _ application: UIApplication,
      handleEventsForBackgroundURLSession identifier: String,
      completionHandler: @escaping () -> Void
    ) {
        ExpoHostRuntime.shared.application(application, handleEventsForBackgroundURLSession: identifier, completionHandler: completionHandler)
    }
    
    @objc public func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        ExpoHostRuntime.shared.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }

    @objc public func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        ExpoHostRuntime.shared.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    }
    
    @objc public func application(
      _ application: UIApplication,
      didReceiveRemoteNotification userInfo: [AnyHashable: Any],
      fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
      ExpoAppDelegateSubscriberManager.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    }
    
    @objc public func application(
      _ application: UIApplication,
      performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
      ExpoAppDelegateSubscriberManager.application(application, performFetchWithCompletionHandler: completionHandler)
    }

  @objc public func initializeExpoUpdates() {
    #if canImport(Expo)
    ExpoHostRuntime.shared.initializeExpoUpdates()
    #else
    ReactNativeHostRuntime.shared.initializeRNUpdates()
    #endif
  }

  @objc public func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    #if canImport(Expo)
    return ExpoHostRuntime.shared.application(app, open: url, options: options)
    #else
    return ReactNativeHostRuntime.shared.application(app, open: url, options: options)
    #endif
  }

  // Universal Links
  @objc public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    #if canImport(Expo)
    return ExpoHostRuntime.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    #else
    return ReactNativeHostRuntime.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
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

  /**
   * Send a serialized JSON message to the React Native JS application.
   * The message is delivered as a `brownfieldMessage` DeviceEventEmitter event.
   *
   * @param message - The serialized JSON message to send to the React Native JS application.
   * @example
   * let json = "{\"text\":\"\(text)\"}"
   * ReactNativeBrownfield.shared.postMessage(json)
   */
  @objc public func postMessage(_ message: String) {
    let userInfo: [String: Any] = ["message": message]
    DispatchQueue.main.async {
      NotificationCenter.default.post(
        name: Notification.Name.brownfieldMessageToJS,
        object: nil,
        userInfo: userInfo
      )
    }
  }

  /**
   * Subscribe to messages sent from JavaScript via `ReactNativeBrownfield.postMessage()`.
   *
   * @param handler Called with the raw JSON string sent from JS.
   * @return An observer token. Pass it to `NotificationCenter.default.removeObserver(_:)` to unsubscribe.
   */
  @objc public func onMessage(_ handler: @escaping (String) -> Void) -> NSObjectProtocol {
    return NotificationCenter.default.addObserver(
      forName: Notification.Name.brownfieldMessageFromJS,
      object: nil,
      queue: .main
    ) { notification in
      if let message = notification.userInfo?["message"] as? String {
        handler(message)
      }
    }
  }
}
