import Brownie
import Foundation
import ReactBrownfield
import SwiftUI
import UIKit

let initialState = BrownfieldStore(
  counter: 0,
  user: User(name: "Username")
)

/*
 Toggles testing playground for side by side brownie mode.
 Default: false
 */
let isSideBySideMode = false

struct ChatMessage: Identifiable {
  let id: Int
  let text: String
  let fromRN: Bool
}

@main
struct MyApp: App {
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("loaded")
    }

    BrownfieldStore.register(initialState)
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }

  struct ContentView: View {
    var body: some View {
      if isSideBySideMode {
        SideBySideView()
      } else {
        FullScreenView()
      }
    }
  }

  struct SideBySideView: View {
    var body: some View {
      VStack(spacing: 0) {
        NativeView()
          .frame(maxHeight: .infinity)

        Divider()

        ReactNativeView(moduleName: "ReactNative")
          .frame(maxHeight: .infinity)
      }
    }
  }

  struct FullScreenView: View {
    var body: some View {
      NavigationView {
        ScrollView {
          VStack(spacing: 12) {
            Text("React Native Brownfield App")
              .font(.title)
              .bold()
              .padding()
              .multilineTextAlignment(.center)

            CounterView()
            UserView()

            NavigationLink("Push React Native Screen") {
              ReactNativeView(moduleName: "ReactNative")
                .navigationBarHidden(true)
            }

            NavigationLink("Push UIKit Screen") {
              UIKitExampleViewControllerRepresentable()
                .navigationBarTitleDisplayMode(.inline)
            }

            MessagesView()
          }
        }
      }.navigationViewStyle(StackNavigationViewStyle())
    }
  }

  struct CounterView: View {
    @UseStore(\BrownfieldStore.counter) var counter

    var body: some View {
      VStack {
        Text("Count: \(Int(counter))")
        Stepper(value: $counter, label: { Text("Increment") })

        .buttonStyle(.borderedProminent)
        .padding(.bottom)
      }
    }
  }

  struct UserView: View {
    @UseStore(\BrownfieldStore.user.name) var name

    var body: some View {
      TextField("Name", text: $name)
        .textFieldStyle(.roundedBorder)
        .padding(.horizontal)
    }
  }

  struct MessagesView: View {
    @State private var messages: [ChatMessage] = []
    @State private var draft: String = ""
    @State private var nextId: Int = 0
    @State private var observer: NSObjectProtocol?

    var body: some View {
        ScrollViewReader {
          proxy in
          VStack(alignment: .leading, spacing: 10) {
            Text("postMessage")
              .font(.headline)
              .frame(maxWidth: .infinity, alignment: .center)

            HStack {
              TextField("Type a message...", text: $draft)
                .textFieldStyle(.roundedBorder)

              Button("Send") {
                let text = draft.isEmpty ? "Hello from Swift! (#\(nextId))" : draft
                let json = "{\"text\":\"\(text)\"}"
                ReactNativeBrownfield.shared.postMessage(json)
                withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                  messages.append(ChatMessage(id: nextId, text: text, fromRN: false))
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
              .id(msg.id) // Add an ID to the message for scrolling
            }
          }
          .padding()
          .onChange(of: messages.count) {
            withAnimation {
              proxy.scrollTo(messages.last?.id, anchor: .bottom)
            }
          }
          .onAppear {
            observer = ReactNativeBrownfield.shared.onMessage { raw in
              var text = raw
              if let data = raw.data(using: .utf8),
                 let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                 let t = json["text"] as? String {
                text = t
              }
              withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                messages.append(ChatMessage(id: nextId, text: text, fromRN: true))
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
        }    }
  }

  struct NativeView: View {
    @UseStore(\BrownfieldStore.counter) var counter
    @UseStore(\BrownfieldStore.user) var user

    var body: some View {
      VStack {
        Text("Native Side")
          .font(.headline)
          .padding(.top)

        Text("User: \(user.name)")
        Text("Count: \(Int(counter))")

        TextField("Name", text: $user.name)
        .textFieldStyle(.roundedBorder)
        .padding(.horizontal)

        Button("Increment") {
          $counter.set { $0 + 1 }
        }
        .buttonStyle(.borderedProminent)

        Spacer()
      }
      .frame(maxWidth: .infinity)
      .background(Color(.systemBackground))
    }
  }
}

struct UIKitExampleViewControllerRepresentable: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> UIKitExampleViewController {
    UIKitExampleViewController()
  }

  func updateUIViewController(_ uiViewController: UIKitExampleViewController, context: Context) {}
}
