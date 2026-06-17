import ReactBrownfield
import SwiftUI

struct MessagesView: View {
    @State private var draft: String = ""
    @State private var nextId: Int = 0

    var body: some View {
        MaterialCard {
            Text("postMessage")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .center)

            HStack {
                TextField("Type a message...", text: $draft)
                    .textFieldStyle(.roundedBorder)

                Button("Send") {
                    let text =
                        draft.isEmpty ? "Hello from iOS! (#\(nextId))" : draft
                    let json = "{\"text\":\"\(text)\"}"
                    ReactNativeBrownfield.shared.postMessage(json)
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.7))
                    {
                        nextId += 1
                    }
                    draft = ""
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier(E2eTestIds.appleAppPostMessageSend)
            }
        }
        .padding()
    }
}
