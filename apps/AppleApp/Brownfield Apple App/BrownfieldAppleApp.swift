import BrownfieldLib
import Brownie
import ReactBrownfield
import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication
            .LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        return ReactNativeBrownfield.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )
    }
}

@main
struct BrownfieldAppleApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        ReactNativeBrownfield.shared.bundle = ReactNativeBundle
        ReactNativeBrownfield.shared.startReactNative {
            print("React Native has been loaded")
        }

        #if USE_EXPO_HOST
            ReactNativeBrownfield.shared.ensureExpoModulesProvider()
        #endif

        BrownfieldStore.register(initialState)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
