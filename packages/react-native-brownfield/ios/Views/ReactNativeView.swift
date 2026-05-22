import SwiftUI

/**
 A UIViewControllerRepresentable that bridges ReactNativeViewController to SwiftUI.
 */
struct ReactNativeViewRepresentable: UIViewControllerRepresentable {
  var moduleName: String
  var initialProperties: [String: Any] = [:]

  func makeUIViewController(context: Context) -> UIViewController {
    return ReactNativeViewController(
      moduleName: moduleName,
      initialProperties: initialProperties
    )
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

/**
 Exposes React Native view to SwiftUI.
 Supports pop to native when using SwiftUI's NavigationView or NavigationStack.
 */
@available(iOS 15.0, *)
public struct ReactNativeView: View {
  @Environment(\.dismiss) var dismiss
  var moduleName: String
  var initialProperties: [String: Any] = [:]

  public init(moduleName: String, initialProperties: [String : Any] = [:]) {
    self.moduleName = moduleName
    self.initialProperties = initialProperties
  }

  public var body: some View {
    ReactNativeViewRepresentable(
      moduleName: moduleName,
      initialProperties: initialProperties
    )
    .ignoresSafeArea(.all)
    .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name.popToNative))
    { notification in
      dismiss()
    }
  }
}
