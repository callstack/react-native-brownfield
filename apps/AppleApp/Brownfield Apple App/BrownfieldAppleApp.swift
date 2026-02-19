import BrownfieldLib
import Brownie
import SwiftUI
import ReactBrownfield

class AppDelegate: NSObject, UIApplicationDelegate {
    var window: UIWindow?
    
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
#if USE_EXPO_HOST
        return ReactNativeHostManager.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
#else
        return true
#endif
    }
}

@main
struct BrownfieldAppleApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {
#if USE_EXPO_HOST
        ReactNativeHostManager.shared.initialize()
#else
        ReactNativeBrownfield.shared.bundle = ReactNativeBundle
        ReactNativeBrownfield.shared.startReactNative {
            print("React Native has been loaded")
        }
#endif
        BrownfieldStore.register(initialState)
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
