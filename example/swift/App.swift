import SwiftUI
import ReactBrownfield

@main
struct MyApp: App {
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("loaded")
    }
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

class NotificationHandler: ObservableObject{
  init() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handlePopToNative(_:)),
      name: NSNotification.Name.popToNative,
      object: nil
    )
  }

  @objc func handlePopToNative(_ notification: Notification) {
    if let result = notification.userInfo?["result"] as? Any {
      print("Received popToNative notification with result: \(result)")
    } else {
      print("Received popToNative notification without result")
    }
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}

struct ContentView: View {
  @StateObject var notificationHandler = NotificationHandler()
  var body: some View {
    NavigationView {
      VStack {
        Text("React Native Brownfield App")
          .font(.title)
          .bold()
          .padding()

        NavigationLink("Push React Native Screen") {
          ReactNativeView(moduleName: "ReactNative")
            .navigationBarHidden(true)
        }
      }
    }
  }
}
