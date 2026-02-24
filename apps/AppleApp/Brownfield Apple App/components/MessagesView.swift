import ReactBrownfield
import SwiftUI

struct MessagesView: View {
    @State private var draft: String = ""
    @State private var nextId: Int = 0
    @State private var observer: NSObjectProtocol?
    @State private var showToast = false
    @State private var toastText = ""

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
                toastText = text
                showToast = true
            }
        }
        .onDisappear {
            if let obs = observer {
                NotificationCenter.default.removeObserver(obs)
                observer = nil
            }
        }
        .overlay(
            showToast
                ? Toast(message: toastText, isShowing: $showToast)
                    .padding(.bottom, 50) : nil
        )
    }
}
