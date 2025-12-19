import Brownie
import ReactBrownfield
import SwiftUI

let initialState = BrownfieldStore(
  counter: 0,
  hasError: false,
  isLoading: false,
  user: User(name: "okwasniewski", settings: Settings(theme: .light))
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
    @UseStore<BrownfieldStore, User>(\.user, key: BrownfieldStore.storeName) var user
    @UseStore<BrownfieldStore, Double>(\.counter, key: BrownfieldStore.storeName) var counter

    var body: some View {
      VStack {
        Text("Native Side")
          .font(.headline)
          .padding(.top)

        Text("User: \(user.name)")
        Text("Count: \(Int(counter))")

        TextField("Name", text: Binding(get: { user.name }, set: { data in
          $user.set { state in
            state.user.name = data
          }
        }))
        .textFieldStyle(.roundedBorder)
        .padding(.horizontal)

        Button("Increment") {
          $counter.set { state in
            state.counter += 1
          }
        }
        .buttonStyle(.borderedProminent)

        Spacer()
      }
      .frame(maxWidth: .infinity)
      .background(Color(.systemBackground))
    }
  }
}
