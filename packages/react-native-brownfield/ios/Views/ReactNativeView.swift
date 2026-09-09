import SwiftUI

/**
 A UIViewControllerRepresentable that bridges ReactNativeViewController to SwiftUI.
 */
struct ReactNativeViewRepresentable: UIViewControllerRepresentable {
  var moduleName: String
  var initialProperties: [String: Any] = [:]
  var waitForFullDisplay = false
  var collectThreadMetrics = false
  var onMetrics: ((BrownfieldDisplayMetrics) -> Void)?

  func makeUIViewController(context: Context) -> UIViewController {
    return ReactNativeViewController(
      moduleName: moduleName,
      initialProperties: initialProperties,
      waitForFullDisplay: waitForFullDisplay,
      collectThreadMetrics: collectThreadMetrics,
      onMetrics: onMetrics
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
  var waitForFullDisplay = false
  var collectThreadMetrics = false
  var onMetrics: ((BrownfieldDisplayMetrics) -> Void)?

  public init(moduleName: String, initialProperties: [String : Any] = [:],
              waitForFullDisplay: Bool = false,
              collectThreadMetrics: Bool = false,
              onMetrics: ((BrownfieldDisplayMetrics) -> Void)? = nil) {
    self.moduleName = moduleName
    self.initialProperties = initialProperties
    self.waitForFullDisplay = waitForFullDisplay
    self.collectThreadMetrics = collectThreadMetrics
    self.onMetrics = onMetrics
  }

  public var body: some View {
    ReactNativeViewRepresentable(
      moduleName: moduleName,
      initialProperties: initialProperties,
      waitForFullDisplay: waitForFullDisplay,
      collectThreadMetrics: collectThreadMetrics,
      onMetrics: onMetrics
    )
    .ignoresSafeArea(.all)
    .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name.popToNative))
    { notification in
      dismiss()
    }
  }
}
