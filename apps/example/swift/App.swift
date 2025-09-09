import ReactBrownfield
import SwiftUI

let initialState = BrownfieldStore(counter: 0, hasError: false, isLoading: false, user: "okwasniewski")

@main
struct MyApp: App {

  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("loaded")
    }

    let state = Store(initialState)
    StoreManager.shared.register(
      store: state,
      for: BrownfieldStore.self
    )
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
    @UseStore<BrownfieldStore, String>(\.user) var user
    @UseStore<BrownfieldStore, Double>(\.counter) var counter

    var body: some View {
      VStack {
        Text("Native Side")
          .font(.headline)
          .padding(.top)

        Text("User: \(user)")
        Text("Count: \(Int(counter))")

        TextField("Name", text: Binding(get: { user }, set: { data in
          $user.set { state in state.user = data }
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
