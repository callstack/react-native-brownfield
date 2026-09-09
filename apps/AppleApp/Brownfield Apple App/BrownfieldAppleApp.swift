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

    public func requestNativeConfirmation(
        _ title: String,
        resolve: @escaping (Any?) -> Void,
        reject: @escaping (String?, String?, (any Error)?) -> Void
    ) {
        DispatchQueue.main.async {
            guard let topController = UIApplication.shared.topMostViewController() else {
                reject(
                    "no_view_controller",
                    "Could not find a view controller to present the confirmation.",
                    nil
                )
                return
            }

            let alert = UIAlertController(title: title, message: nil, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
                resolve(true)
            })
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in
                resolve(false)
            })
            topController.present(alert, animated: true)
        }
    }

    public func showNativeBanner(
        _ message: String,
        onDismiss onDismiss: @escaping ([Any]?) -> Void
    ) {
        DispatchQueue.main.async {
            guard let topController = UIApplication.shared.topMostViewController() else {
                onDismiss([])
                return
            }

            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Dismiss", style: .default) { _ in
                onDismiss([])
            })
            topController.present(alert, animated: true)
        }
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
        #if USE_EXPO_HOST
            ReactNativeBrownfield.shared.ensureExpoModulesProvider()
        #endif

        BrownfieldStore.register(initialState)

        // `preloadBundle: true` starts the React Host now, and React Native then reads the
        // bundle URL on the JavaScript thread. Thus this call is the last operation.
        ReactNativeBrownfield.shared.startReactNative(
            launchOptions: nil,
            preloadBundle: true,
            onBundleLoaded: BrownfieldMetricsLogger.logStartup
        )
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

// Console reporting is available in both Debug and Release. Unavailable samples
// stay explicit instead of being rendered as zero FPS or zero load time.
enum BrownfieldMetricsLogger {
    static func logStartup(_ timings: JSBundleTimings) {
        print("[AppleApp][startup] jsBundleLoadTime=\(number(timings.jsBundleLoadTime)) jsBundleEvaluationTime=\(number(timings.jsBundleEvaluationTime))")
         for interval in timings.timeline {
             let tag = interval["tag"] as? String ?? "unknown"
             print("[AppleApp][startup][\(tag)] startMs=\(number(interval["startMs"] as? NSNumber)) stopMs=\(number(interval["stopMs"] as? NSNumber))")
         }
    }

    static func logDisplay(_ metrics: BrownfieldDisplayMetrics) {
        let label = "[AppleApp][\(metrics.moduleName)][ Display Event ]"
        if let initial = metrics.initialDisplay {
            logInterval(initial, label: "\(label)[TTID]")
        }
        if let full = metrics.fullDisplay {
            logInterval(full, label: "\(label)[TTFD]")
        }
    }

    private static func logInterval(_ interval: BrownfieldDisplayInterval, label: String) {
        print("\(label) duration=\(String(format: "%.2f", interval.duration)) JS={\(thread(interval.jsThread))} UI={\(thread(interval.uiThread))}")
    }

    private static func thread(_ metrics: BrownfieldThreadMetrics) -> String {
        // busyRatio describes time beyond frame deadlines, not CPU utilization.
        "fps=\(number(metrics.fps)) busyRatio=\(number(metrics.busyRatio)) sampledMs=\(String(format: "%.2f", metrics.sampledMs)) frames=\(metrics.frameCount)"
    }

    private static func number(_ value: NSNumber?) -> String {
        guard let value else { return "unavailable" }
        return String(format: "%.2f", value.doubleValue)
    }
}
