import UIKit
import SwiftUI

class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    ReactNativeBrownfield.shared().entryFile = "index"
    ReactNativeBrownfield.shared().startReactNative {
      print("loaded")
    }
    
    return true
  }
}

struct UIViewControllerWrapper: UIViewControllerRepresentable {
  let viewController: UIViewController
  
  func makeUIViewController(context: Context) -> UIViewController {
    return viewController
  }
  
  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

@main
struct MyApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

// Main content view
struct ContentView: View {
  var body: some View {
    NavigationView {
      VStack {
        Text("React Native Brownfield App")
          .font(.title)
          .bold()
          .padding()
        NavigationLink("Push React Native Screen") {
          UIViewControllerWrapper(viewController: ReactNativeViewController(moduleName: "ReactNative"))
        }
      }
    }
  }
}

