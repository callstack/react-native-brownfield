import BrownfieldLib
import ReactBrownfield
import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {
    var window: UIWindow?
}

@main
struct BrownfieldAppleApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        ReactNativeBrownfield.shared.bundle = ReactNativeBundle
        ReactNativeBrownfield.shared.startReactNative {
            print("React Native has been loaded")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
