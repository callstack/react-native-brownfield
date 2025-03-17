import UIKit
import ReactNativeBrownfield

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    ReactNativeBrownfield.shared.startReactNative {
      print("loaded")
    }
    return true
  }
}

