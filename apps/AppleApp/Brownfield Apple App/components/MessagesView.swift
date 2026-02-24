import ReactBrownfield
import SwiftUI

struct MessagesView: View {
    @State private var messages: [ChatMessage] = []
    @State private var draft: String = ""
    @State private var nextId: Int = 0
    @State private var observer: NSObjectProtocol?

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
            }
        }
        .padding()
        .onAppear {
            observer = ReactNativeBrownfield.shared.onMessage { raw in
                var text = raw
                if let data = raw.data(using: .utf8),
                    let json = try? JSONSerialization.jsonObject(with: data)
                        as? [String: Any],
                    let t = json["text"] as? String
                {
                    text = t
                }
                withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                    messages.insert(
                        ChatMessage(id: nextId, text: text, fromRN: true),
                        at: 0
                    )
                    nextId += 1
                }
            }
        }
        .onDisappear {
            if let obs = observer {
                NotificationCenter.default.removeObserver(obs)
                observer = nil
            }
        }
    }
}
