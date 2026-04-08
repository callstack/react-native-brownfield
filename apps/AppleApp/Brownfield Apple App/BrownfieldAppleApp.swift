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
        print("==== Brownfield: Initializing...")
        ReactNativeBrownfield.shared.bundle = ReactNativeBundle
        ReactNativeBrownfield.shared.startReactNative {
            print("React Native has been loaded")
        }
        
        return ReactNativeBrownfield.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )
    }
    
    func application(_ application: UIApplication, willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        return ReactNativeBrownfield.shared.application(application, willFinishLaunchingWithOptions: launchOptions)
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        ReactNativeBrownfield.shared.applicationDidBecomeActive(application)
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
        ReactNativeBrownfield.shared.applicationWillResignActive(application)
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
        ReactNativeBrownfield.shared.applicationDidEnterBackground(application)
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
        ReactNativeBrownfield.shared.applicationWillEnterForeground(application)
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        ReactNativeBrownfield.shared.applicationWillTerminate(application)
    }
    
    func applicationDidReceiveMemoryWarning(_ application: UIApplication) {
        ReactNativeBrownfield.shared.applicationDidReceiveMemoryWarning(application)
    }
    
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        ReactNativeBrownfield.shared.application(application, handleEventsForBackgroundURLSession: identifier, completionHandler: completionHandler)
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        ReactNativeBrownfield.shared.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
        ReactNativeBrownfield.shared.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        ReactNativeBrownfield.shared.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    }
    
    func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        ReactNativeBrownfield.shared.application(application, performFetchWithCompletionHandler: completionHandler)
    }
}

public class RNNavigationDelegate: BrownfieldNavigationDelegate {
    public func navigateToSettings() {
        present(SettingsScreen())
    }

    public func navigateToReferrals(_ userId: String) {
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
//        print("==== Brownfield: Initializing...")
//        ReactNativeBrownfield.shared.bundle = ReactNativeBundle
//        ReactNativeBrownfield.shared.startReactNative {
//            print("React Native has been loaded")
////            ReactNativeBrownfield.shared.initializeExpoUpdates()
//        }

        BrownfieldNavigationManager.shared.setDelegate(
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
