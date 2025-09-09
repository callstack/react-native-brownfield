import Brownie
import ReactBrownfield
import SwiftUI

let initialState = BrownfieldStore(
  counter: 0,
  hasError: false,
  isLoading: false,
  user: User(name: "okwasniewski")
)

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
      VStack(spacing: 0) {
        NativeView()
          .frame(maxHeight: .infinity)

        Divider()

        ReactNativeView(moduleName: "ReactNative")
          .frame(maxHeight: .infinity)
      }
    }
  }

  struct NativeView: View {
    @UseStore<BrownfieldStore> var store

    var body: some View {
      VStack {
        Text("Native Side")
          .font(.headline)
          .padding(.top)

        Text("User: \(store.state.user.name)")
        Text("Count: \(Int(store.state.counter))")

        TextField("Name", text: Binding(get: { store.state.user.name }, set: { data in
          store.set { $0.user.name = data }
        }))
        .textFieldStyle(.roundedBorder)
        .padding(.horizontal)

        Button("Increment") {
          store.set { $0.counter += 1 }
        }
        .buttonStyle(.borderedProminent)

        Spacer()
      }
      .frame(maxWidth: .infinity)
      .background(Color(.systemBackground))
    }
  }
}
