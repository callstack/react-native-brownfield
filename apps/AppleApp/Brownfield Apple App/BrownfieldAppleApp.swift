import BrownfieldLib
import Brownie
import ReactBrownfield
import SwiftUI
import UIKit
import BrownfieldNavigation

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

public class RNNavigationDelegate: BrownfieldNavigationDelegate {
    public func navigateToSettings() {
        present(SettingsScreen())
    }

    public func navigateToReferrals(userId: String) {
        present(ReferralsScreen(userId: userId))
    }

    private func present<Content: View>(_ view: Content) {
        DispatchQueue.main.async {
            let hostingController = UIHostingController(rootView: view)

            guard let topController = UIApplication.shared.topMostViewController() else {
                return
            }

            if let navigationController = topController.navigationController {
                navigationController.pushViewController(hostingController, animated: true)
                return
            }

            let navigationController = UINavigationController(rootViewController: hostingController)
            topController.present(navigationController, animated: true)
        }
    }
}

private extension UIApplication {
    func topMostViewController(
        base: UIViewController? = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })?.rootViewController
    ) -> UIViewController? {
        if let navigationController = base as? UINavigationController {
            return topMostViewController(base: navigationController.visibleViewController)
        }
        if let tabBarController = base as? UITabBarController,
           let selected = tabBarController.selectedViewController {
            return topMostViewController(base: selected)
        }
        if let presented = base?.presentedViewController {
            return topMostViewController(base: presented)
        }
        return base
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
        
//        let mgr = ReactBrownfield.BrownfieldNavigationManager.shared
//        print("SWIFT mgr:", Unmanaged.passUnretained(mgr).toOpaque())
//        print("SWIFT class:", NSStringFromClass(type(of: mgr)))
//        print("SWIFT bundle:", Bundle(for: ReactBrownfield.BrownfieldNavigationManager.self).bundlePath)
//        ReactBrownfield.BrownfieldNavigationManager.shared.setDelegate(navigationDelegate: RNNavigationDelegate())
        
        let mgr = BrownfieldNavigationManager.shared
        print("11 SWIFT mgr:", Unmanaged.passUnretained(mgr).toOpaque())
        print("11 SWIFT class:", NSStringFromClass(type(of: mgr)))
        print("11 SWIFT bundle:", Bundle(for: BrownfieldNavigationManager.self).bundlePath)
        
        mgr.setDelegate(
            navigationDelegate: RNNavigationDelegate()
        )

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
