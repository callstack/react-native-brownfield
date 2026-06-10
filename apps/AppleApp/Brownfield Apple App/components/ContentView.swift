import Brownie
import ReactBrownfield
import SwiftUI
import UIKit

struct ChatMessage: Identifiable {
    let id: Int
    let text: String
    let fromRN: Bool
}

let initialState = BrownfieldStore(
    counter: 0,
    user: User(name: "Username")
)

#if USE_EXPO_HOST
private let hostAppName = "iOS Expo"
#else
private let hostAppName = "iOS Vanilla"
#endif

// The packaged brownfield example surface is registered under `RNApp`
// for both the plain React Native and Expo example apps.
private let reactNativeModuleName = "RNApp"

struct ContentView: View {
    var body: some View {
        NavigationView {

            VStack(spacing: 16) {
                GreetingCard(name: hostAppName)

                MessagesView()

                ReactNativeView(
                    moduleName: reactNativeModuleName,
                    initialProperties: [
                        "nativeOsVersionLabel":
                            "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)"
                    ]
                )
                    .navigationBarHidden(true)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .background(Color(UIColor.systemBackground))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(16)
        }
    }
}

#Preview {
    ContentView()
}
