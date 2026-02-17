internal import Expo
internal import React
internal import ReactAppDependencyProvider
internal import React_RCTAppDelegate
import UIKit

public class ReactNativeHostManager {
  public static let shared = ReactNativeHostManager()
  
  private var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  private var reactNativeFactory: RCTReactNativeFactory?
  private var expoDelegate: ExpoAppDelegate?
  
  public func initialize() {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    
    expoDelegate = ExpoAppDelegate()
    expoDelegate?.bindReactNativeFactory(factory)
    
    // required to avoid this being file be stripped by the swift compiler
    let _ = ExpoModulesProvider()
  }
  
  // propagate delegate methods to ExpoAppDelegate
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    ((expoDelegate?.application(application, didFinishLaunchingWithOptions: launchOptions)) != nil)
  }
  
  // load & present RN UI
  public func loadView(
    moduleName: String, initialProps: [AnyHashable: Any]?,
    launchOptions: [AnyHashable: Any]?
  ) -> UIView {
    let bundleURL = reactNativeDelegate?.bundleURL()
    return
    (expoDelegate?.recreateRootView(
      withBundleURL: bundleURL, moduleName: moduleName, initialProps: initialProps,
      launchOptions: launchOptions))!
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }
  
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(
      forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return ReactNativeBundle.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
