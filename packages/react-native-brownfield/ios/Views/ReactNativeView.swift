import SwiftUI

/**
 Links a SwiftUI `ReactNativeView` to the view controller it hosts, so the
 SwiftUI layer can ask whether this surface may act on `popToNative()`.
 */
final class BrownfieldSurfaceHost {
  weak var controller: ReactNativeViewController?

  var isPopTarget: Bool { controller?.isPopTarget ?? false }
}

/**
 A UIViewControllerRepresentable that bridges ReactNativeViewController to SwiftUI.
 */
struct ReactNativeViewRepresentable: UIViewControllerRepresentable {
  var moduleName: String
  var initialProperties: [String: Any] = [:]
  var host: BrownfieldSurfaceHost
  var waitForFullDisplay = false
  var collectThreadMetrics = false
  var onMetrics: ((BrownfieldDisplayMetrics) -> Void)?

  func makeUIViewController(context: Context) -> UIViewController {
    let controller = ReactNativeViewController(
      moduleName: moduleName,
      initialProperties: initialProperties,
      waitForFullDisplay: waitForFullDisplay,
      collectThreadMetrics: collectThreadMetrics,
      onMetrics: onMetrics
    )
    controller.isHostedBySwiftUI = true
    host.controller = controller
    return controller
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
    if let controller = uiViewController as? ReactNativeViewController {
      host.controller = controller
    }
  }
}

/**
 Exposes React Native view to SwiftUI.
 Supports pop to native when using SwiftUI's NavigationView or NavigationStack.
 */
@available(iOS 15.0, *)
public struct ReactNativeView: View {
  @Environment(\.dismiss) var dismiss
  @State private var host = BrownfieldSurfaceHost()
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
      host: host,
      waitForFullDisplay: waitForFullDisplay,
      collectThreadMetrics: collectThreadMetrics,
      onMetrics: onMetrics
    )
    .ignoresSafeArea(.all)
    // `.popToNative` is public API and may be posted from any thread, while
    // `host.isPopTarget` reads UIKit state — so deliver on main.
    .onReceive(
      NotificationCenter.default
        .publisher(for: NSNotification.Name.popToNative)
        .receive(on: DispatchQueue.main)
    ) { _ in
      // Every live surface receives this app-wide notification; only the
      // topmost on-screen one may dismiss.
      // https://github.com/callstack/react-native-brownfield/issues/354
      guard host.isPopTarget else { return }
      dismiss()
    }
  }
}
