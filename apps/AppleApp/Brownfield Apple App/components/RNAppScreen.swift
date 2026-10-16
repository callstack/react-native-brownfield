import ReactBrownfield
import SwiftUI
import UIKit

#if USE_EXPO_HOST
private let reactNativeModuleName = "main"
// The Expo example bundles do not yet send the JS full-display marker.
private let waitForFullDisplay = false
#else
private let reactNativeModuleName = "RNApp"
private let waitForFullDisplay = true
#endif

private var brownfieldInitialProperties: [String: Any] {
    [
        "nativeOsVersionLabel":
            "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
        "brownfieldE2E": ProcessInfo.processInfo.arguments.contains("-DetoxE2E"),
    ]
}

struct RNAppScreen: View {
    var body: some View {
        ReactNativeView(
            moduleName: reactNativeModuleName,
            initialProperties: brownfieldInitialProperties,
            waitForFullDisplay: waitForFullDisplay,
            collectThreadMetrics: true,
            onMetrics: BrownfieldMetricsLogger.logDisplay
        )
        .navigationBarHidden(true)
        .ignoresSafeArea()
    }
}
