import ReactBrownfield
import Brownie
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
            MainScreen()
                .padding(16)
        }
    }
}

struct MainScreen: View {    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                GreetingCard(name: "iOS")
                
                ReactNativeView(moduleName: "RNApp")
                    .navigationBarHidden(true)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .background(Color(UIColor.systemBackground))
                
                Spacer(minLength: 16)
                
                MessagesView()
            }
            .frame(maxWidth: .infinity)
        }
    }
}

struct GreetingCard: View {
    let name: String
    @UseStore(\BrownfieldStore.counter) var counter
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Hello native \(name) 👋")
                .font(.title3)
                .multilineTextAlignment(.center)
            
            Text(
                "You clicked the button \(Int(counter)) time\(counter == 1 ? "" : "s")"
            )
            .multilineTextAlignment(.center)
            .font(.body)
            
            Button("Increment counter") {
                $counter.set { $0 + 1 }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(16)
        .shadow(radius: 4)
    }
}

struct MessagesView: View {
    @State private var messages: [ChatMessage] = []
    @State private var draft: String = ""
    @State private var nextId: Int = 0
    @State private var observer: NSObjectProtocol?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("postMessage")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .center)
            
            HStack {
                TextField("Type a message...", text: $draft)
                    .textFieldStyle(.roundedBorder)
                
                Button("Send") {
                    let text = draft.isEmpty ? "Hello from iOS! (#\(nextId))" : draft
                    let json = "{\"text\":\"\(text)\"}"
                    ReactNativeBrownfield.shared.postMessage(json)
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                        messages.insert(ChatMessage(id: nextId, text: text, fromRN: false), at: 0)
                        nextId += 1
                    }
                    draft = ""
                }
                .buttonStyle(.borderedProminent)
            }
            
            ForEach(messages) { msg in
                HStack {
                    if !msg.fromRN { Spacer() }
                    VStack(alignment: msg.fromRN ? .leading : .trailing, spacing: 2) {
                        Text(msg.fromRN ? "From React Native" : "Sent")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(msg.text)
                            .font(.body)
                    }
                    .padding(10)
                    .background(msg.fromRN ? Color(.systemGray5) : Color.accentColor.opacity(0.15))
                    .cornerRadius(12)
                    .frame(maxWidth: 260, alignment: msg.fromRN ? .leading : .trailing)
                    if msg.fromRN { Spacer() }
                }
                .transition(.asymmetric(
                    insertion: .move(edge: .top).combined(with: .opacity),
                    removal: .opacity
                ))
            }
        }
        .padding()
        .onAppear {
            observer = ReactNativeBrownfield.shared.onMessage { raw in
                var text = raw
                if let data = raw.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let t = json["text"] as? String {
                    text = t
                }
                withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                    messages.insert(ChatMessage(id: nextId, text: text, fromRN: true), at: 0)
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

#Preview {
    ContentView()
}
