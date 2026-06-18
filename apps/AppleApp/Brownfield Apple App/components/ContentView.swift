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

private func brownfieldPostMessageText(from raw: String) -> String {
    if let data = raw.data(using: .utf8),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let text = json["text"] as? String
    {
        return text
    }
    return raw
}

struct ContentView: View {
    @State private var messageObserver: NSObjectProtocol?
    @State private var showPostMessageToast = false
    @State private var postMessageToastText = ""

    var body: some View {
        NavigationView {
            ZStack {
                ScrollView {
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
                        .frame(minHeight: 520)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(16)
                }

                if showPostMessageToast {
                    Toast(
                        message: postMessageToastText,
                        isShowing: $showPostMessageToast
                    )
                }
            }
        }
        .onAppear {
            messageObserver = ReactNativeBrownfield.shared.onMessage { raw in
                postMessageToastText = brownfieldPostMessageText(from: raw)
                showPostMessageToast = true
            }
        }
        .onDisappear {
            if let observer = messageObserver {
                NotificationCenter.default.removeObserver(observer)
                messageObserver = nil
            }
        }
    }
}
