import SwiftUI
import ReactBrownfield


// TODO: THIS WILL BE AUTO GENERATED
struct AppState: Codable {
  var counter: Int = 0
  var user: String = "DUPA"
  var isLoading: Bool = false
  var todos: [String] = []
}

@main
struct MyApp: App {
  
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("loaded")
    }
    
    let state = Store(AppState())
    StoreManager.shared.register(
      store: state,
      for: AppState.self
    )
  }
  
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

struct ContentView: View {
  @UseStore<AppState, String>(\.user) var user
  @UseStore<AppState, Int>(\.counter) var counter
  
  var body: some View {
    NavigationView {
      VStack {
        Text("React Native Brownfield App \(user)")
          .font(.title)
          .bold()
          .padding()
        
        TextField("Name", text: Binding(get: { user }, set: { data in
          $user.set { state in state.user = data }
        }))
        
        Text("Count: \(counter)")
        
        Button("Increment") {
          $counter.set { state in
            state.counter += 1
          }
        }
        
        NavigationLink("Push React Native Screen") {
          ReactNativeView(moduleName: "ReactNative")
            .navigationBarHidden(true)
        }
      }
    }
  }
}
