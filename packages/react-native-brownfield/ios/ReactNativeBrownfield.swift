import UIKit
internal import React
internal import React_RCTAppDelegate
internal import ReactAppDependencyProvider

#if canImport(Expo)
internal import Expo
#endif

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
    let resourceURLComponents = bundlePath.components(separatedBy: ".")
    let withoutLast = resourceURLComponents[..<(resourceURLComponents.count - 1)]
    let resourceName = withoutLast.joined()
    let fileExtension = resourceURLComponents.last ?? ""
    
    return bundle.url(forResource: resourceName, withExtension: fileExtension)
#endif
  }
}

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
  @objc public var bundle: Bundle = Bundle.main {
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

extension Notification.Name {
  /**
   * Notification sent when React Native wants to navigate back to native screen.
   */
  public static let popToNative = Notification.Name("PopToNativeNotification")
  /**
   * Notification sent to enable/disable the pop gesture recognizer.
   */
  public static let togglePopGestureRecognizer = Notification.Name("TogglePopGestureRecognizerNotification")
}

private final class ReactNativeHostRuntime: NSObject {
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


#if canImport(Expo)
private final class ExpoHostRuntime {
  static let shared = ExpoHostRuntime()

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
  ) -> UIView {
    let bundleURL = delegate.bundleURL()
      
    if let view = expoDelegate?.recreateRootView(
      withBundleURL: bundleURL,
      moduleName: moduleName,
      initialProps: initialProps,
      launchOptions: launchOptions
    ) {
      return view
    }

    return nil
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
    let resourceURLComponents = bundlePath.components(separatedBy: ".")
    let withoutLast = resourceURLComponents[..<(resourceURLComponents.count - 1)]
    let resourceName = withoutLast.joined()
    let fileExtension = resourceURLComponents.last ?? ""
      
    return bundle.url(forResource: resourceName, withExtension: fileExtension)
#endif
  }
}
#endif

