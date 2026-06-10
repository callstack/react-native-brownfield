import BrownfieldLib
import Brownie
import ReactBrownfield
import SwiftUI
import UIKit
import BrownfieldNavigation

class AppDelegate: NSObject, UIApplicationDelegate {
    var window: UIWindow?
    private let navigationDelegate = RNNavigationDelegate()

    func registerNavigationDelegate() {
        BrownfieldNavigationManager.shared.setDelegate(
            navigationDelegate: navigationDelegate
        )
    }

    func clearNavigationDelegate() {
        BrownfieldNavigationManager.shared.clearDelegate()
    }

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
    
    func application(_ application: UIApplication, willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        return ReactNativeBrownfield.shared.application(application, willFinishLaunchingWithOptions: launchOptions)
    }
}

public class RNNavigationDelegate: BrownfieldNavigationDelegate {
    public func navigateToSettings(_ user: BrownfieldNavigation.UserType) {
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
        ReactNativeBrownfield.shared.bundle = ReactNativeBundle
        ReactNativeBrownfield.shared.preferEmbeddedBundleInDebug = true
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
            RootContentView(appDelegate: appDelegate)
        }
    }
}

private struct RootContentView: View {
    @Environment(\.scenePhase) private var scenePhase

    let appDelegate: AppDelegate

    var body: some View {
        ContentView()
            .onAppear {
                syncNavigationDelegate(for: scenePhase)
            }
            .onChange(of: scenePhase) { newPhase in
                syncNavigationDelegate(for: newPhase)
            }
    }

    private func syncNavigationDelegate(for phase: ScenePhase) {
        switch phase {
        case .active:
            appDelegate.registerNavigationDelegate()
        case .inactive, .background:
            appDelegate.clearNavigationDelegate()
        @unknown default:
            appDelegate.clearNavigationDelegate()
        }
    }
}
