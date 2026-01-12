import Brownie
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

@main
struct MyApp: App {
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("loaded")
    }

    _ = Store(initialState, key: BrownfieldStore.storeName)
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
        VStack {
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
