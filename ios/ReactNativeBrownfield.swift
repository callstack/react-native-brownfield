import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@objc public class ReactNativeBrownfield: RCTDefaultReactNativeFactoryDelegate {
  @objc public static let shared = ReactNativeBrownfield()
  
  @objc public var entryFile: String
  @objc public var fallbackResource: String?
  @objc public var bundlePath: String
  @objc public var reactNativeFactory: RCTReactNativeFactory?
  private var onBundleLoaded: (() -> Void)?
  
  private override init() {
    self.entryFile = "index"
    self.fallbackResource = nil
    self.bundlePath = "main.jsbundle"
    super.init()
  }
  
  @objc public func startReactNative() {
    startReactNative(onBundleLoaded: nil)
  }
  
  @objc public func startReactNative(onBundleLoaded: (() -> Void)?) {
    startReactNative(onBundleLoaded: onBundleLoaded, launchOptions: nil)
  }
  
  @objc public func startReactNative(onBundleLoaded: (() -> Void)?, launchOptions: [AnyHashable: Any]?) {
    guard reactNativeFactory == nil else { return }
    
    self.dependencyProvider = RCTAppDependencyProvider()
    self.reactNativeFactory = RCTReactNativeFactory(delegate: self)
    
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
  
  // MARK: - RCTBridgeDelegate Methods
  
  @objc public override func sourceURL(for bridge: RCTBridge) -> URL? {
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

extension Notification.Name {
  public static let popToNative = Notification.Name("PopToNativeNotification")
  public static let togglePopGestureRecognizer = Notification.Name("TogglePopGestureRecognizerNotification")
}
