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

struct ContentView: View {
    var body: some View {
        NavigationView {

            VStack(spacing: 16) {
                GreetingCard(name: "iOS Expo")

                MessagesView()

                ReactNativeView(moduleName: "main")
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
