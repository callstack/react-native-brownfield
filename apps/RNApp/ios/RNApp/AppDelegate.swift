import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Brownie

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    // Register in the same Brownie instance React Native uses (see BrownieBootstrap).
    BrownieBootstrap.register(
      BrownfieldStore(
        counter: 0,
        user: User(name: "Username")
      )
    )

    factory.startReactNative(
      withModuleName: "RNApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Detox passes -BrownfieldPreferEmbeddedBundleInDebug; E2E builds embed main.jsbundle
    // via FORCE_BUNDLING=1 (see apps/RNApp/.detoxrc.cjs). Local `yarn ios` keeps using Metro.
    if ProcessInfo.processInfo.arguments.contains("-BrownfieldPreferEmbeddedBundleInDebug"),
       let embedded = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return embedded
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
