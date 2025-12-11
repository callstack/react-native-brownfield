import ReactBrownfield
import SwiftUI

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

struct ContentView: View {
  var body: some View {
        NavigationView {
          VStack {
              Text("React Native Brownfield App")
              .font(.title)
              .bold()
              .padding()
              .multilineTextAlignment(.center)
              
              NavigationLink("Push React Native Screen") {
              ReactNativeView(moduleName: "ReactNative")
                  .navigationBarHidden(true)
              }
              
              Button("Stop React Native") {
              ReactNativeBrownfield.shared.stopReactNative()
              }
              .buttonStyle(PlainButtonStyle())
              .padding(.top)
              .foregroundColor(.red)
          }
        }
    }
}
