import UIKit
internal import React

@objc public class ReactNativeViewController: UIViewController {
  private var moduleName: String
  private var initialProperties: [String: Any]?

  @objc public init(moduleName: String, initialProperties: [String: Any]? = nil) {
    self.moduleName = moduleName
    self.initialProperties = initialProperties
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func viewDidLoad() {
    super.viewDidLoad()

    if !moduleName.isEmpty {
      view = ReactNativeBrownfield.shared.view(
        moduleName: moduleName,
        initialProps: initialProperties,
        launchOptions: nil
      )

      NotificationCenter.default.addObserver(
        self,
        selector: #selector(togglePopGestureRecognizer(_:)),
        name: NSNotification.Name.togglePopGestureRecognizer,
        object: nil
      )

      NotificationCenter.default.addObserver(
        self,
        selector: #selector(popToNative(_:)),
        name: NSNotification.Name.popToNative,
        object: nil
      )
    }
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func togglePopGestureRecognizer(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let enabled = userInfo["enabled"] as? Bool else { return }

    DispatchQueue.main.async { [weak self] in
      self?.navigationController?.interactivePopGestureRecognizer?.isEnabled = enabled
    }
  }

  @objc private func popToNative(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let animated = userInfo["animated"] as? Bool else { return }

    DispatchQueue.main.async { [weak self] in
      self?.navigationController?.popViewController(animated: animated)
    }
  }
}
