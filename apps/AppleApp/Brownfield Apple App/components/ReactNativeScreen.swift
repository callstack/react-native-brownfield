import ReactBrownfield
import SwiftUI
import UIKit

/// Settings of the React Native library consumed by this host app.
///
/// `USE_EXPO_HOST` selects which RN bundle the host links against, so the module
/// name and the greeting copy have to follow it.
enum BrownfieldHost {
    #if USE_EXPO_HOST
    static let appName = "iOS Expo"
    static let moduleName = "main"
    #else
    static let appName = "iOS Vanilla"
    static let moduleName = "RNApp"
    #endif

    static var initialProperties: [String: Any] {
        [
            "nativeOsVersionLabel":
                "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
            "brownfieldE2E": ProcessInfo.processInfo.arguments.contains("-DetoxE2E"),
        ]
    }
}

/// React Native presented as its own screen instead of being embedded inline.
///
/// `ReactNativeView` wraps `ReactNativeViewController`, so the destination gets a
/// view controller of its own at the top of the host's navigation stack. Hiding the
/// navigation bar hands the whole screen to React Native — the surface ignores the
/// safe area and draws its own header — while the host keeps the back button, the
/// edge-swipe gesture, and `ReactNativeBrownfield.popToNative()` working.
struct ReactNativeScreen: View {
    var moduleName: String = BrownfieldHost.moduleName

    var body: some View {
        ReactNativeView(
            moduleName: moduleName,
            initialProperties: BrownfieldHost.initialProperties
        )
    .navigationBarHidden(true)
    }
}

/// Entry point to `ReactNativeScreen` from the native shell.
struct ReactNativeScreenLink: View {
    var moduleName: String = BrownfieldHost.moduleName

    var body: some View {
        MaterialCard {
            Text("React Native screen")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .center)

            Text("Opens the React Native bundle as a nested native screen.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            NavigationLink {
                ReactNativeScreen(moduleName: moduleName)
            } label: {
                Text("Open React Native screen")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
            }
            .buttonStyle(.borderedProminent)
            .accessibilityIdentifier(E2eTestIds.appleAppOpenReactNativeScreen)
        }
        .padding()
    }
}
