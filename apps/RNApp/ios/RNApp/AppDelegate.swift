import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Brownie
import BrownfieldLib

private let initialBrownfieldStore = RnAppBrownfieldStore(
  counter: 0,
  user: RnAppUser(name: "Username")
)

private struct RnAppUser: Codable {
  let name: String
}

private struct RnAppBrownfieldStore: BrownieStoreProtocol {
  static let storeName = "BrownfieldStore"

  let counter: Double
  let user: RnAppUser
}

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

    factory.startReactNative(
      withModuleName: "RNApp",
      in: window,
      launchOptions: launchOptions
    )

    RnAppBrownfieldStore.register(initialBrownfieldStore)
    // RNApp links Brownie in both the app target and BrownfieldLib, so seed both
    // registries before JS reads the store.
    registerInitialBrownfieldStoreInFramework()

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
