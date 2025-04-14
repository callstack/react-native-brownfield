import UIKit
internal import React
internal import React_RCTAppDelegate
internal import ReactAppDependencyProvider

class ReactNativeBrownfieldDelegate: RCTDefaultReactNativeFactoryDelegate {
  var entryFile = "index"
  // MARK: - RCTReactNativeFactoryDelegate Methods
  
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bundleURL()
  }
  
  public override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: entryFile)
#else
    let resourceURLComponents = bundlePath.components(separatedBy: ".")
    let withoutLast = resourceURLComponents[..<(resourceURLComponents.count - 1)]
    let resourceName = withoutLast.joined()
    let fileExtension = resourceURLComponents.last ?? ""
    
    return Bundle.main.url(forResource: resourceName, withExtension: fileExtension)
#endif
  }
}

@objc public class ReactNativeBrownfield: NSObject {
  public static let shared = ReactNativeBrownfield()
  private var onBundleLoaded: (() -> Void)?
  private var delegate = ReactNativeBrownfieldDelegate()
  
  /**
   * Path to JavaScript root.
   * Default value: "index"
   */
  @objc public var entryFile: String = "index" {
    didSet {
      delegate.entryFile = entryFile
    }
  }
  /**
   * Path to bundle fallback resource.
   * Default value: nil
   */
  @objc public var fallbackResource: String? = nil
  /**
   * Path to JavaScript bundle file.
   * Default value: "main.jsbundle"
   */
  @objc public var bundlePath: String = "main.jsbundle"
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
  @objc public func startReactNative() {
    startReactNative(onBundleLoaded: nil)
  }
  
  @objc public func view(
    moduleName: String,
    initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]? = nil
  ) -> UIView? {
    reactNativeFactory?.rootViewFactory.view(
      withModuleName: moduleName,
      initialProperties: initialProps,
      launchOptions: launchOptions
    )
  }
  
  /**
   * Starts React Native with optional callback when bundle is loaded.
   *
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   */
  @objc public func startReactNative(onBundleLoaded: (() -> Void)?) {
    startReactNative(onBundleLoaded: onBundleLoaded, launchOptions: nil)
  }
  
  /**
   * Starts React Native with optional callback and launch options.
   *
   * @param onBundleLoaded Optional callback invoked after JS bundle is fully loaded.
   * @param launchOptions Launch options, typically passed from AppDelegate.
   */
  @objc public func startReactNative(onBundleLoaded: (() -> Void)?, launchOptions: [AnyHashable: Any]?) {
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
