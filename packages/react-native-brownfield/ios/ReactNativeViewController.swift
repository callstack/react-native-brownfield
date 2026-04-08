import UIKit
internal import React
internal import EXUpdates

@objc public class ReactNativeViewController: UIViewController {
  private var moduleName: String
  private var initialProperties: [String: Any]?
  private let updatesDelegate = ReactNativeUpdatesDelegate()
  private var hasRenderedReactNativeView = false
    

  @objc public init(moduleName: String, initialProperties: [String: Any]? = nil) {
    self.moduleName = moduleName
    self.initialProperties = initialProperties
    AppController.sharedInstance.delegate = updatesDelegate
      AppController.sharedInstance.start()
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func viewDidLoad() {
    super.viewDidLoad()
      
      updatesDelegate.onDidStart = { [weak self] in
        self?.renderReactNativeViewIfNeeded()
      }

    if !moduleName.isEmpty {

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

  private func renderReactNativeViewIfNeeded() {
      print("==== rendering now -- \(moduleName)")
      guard !moduleName.isEmpty else { return }
    
    print("==== rendering now")
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
        print("==== rendering !hasRenderedRNView")
      guard let reactView = ReactNativeBrownfield.shared.view(
        moduleName: self.moduleName,
        initialProps: self.initialProperties,
        launchOptions: nil
      ) else { return }
      self.view = reactView
//      self.hasRenderedReactNativeView = true
        print("==== rendering hasRenderedRNView")
    }
  }
}

private final class ReactNativeUpdatesDelegate: NSObject, AppControllerDelegate {
  var onDidStart: (() -> Void)?

  func appController(_ appController: any EXUpdates.AppControllerInterface, didStartWithSuccess success: Bool) {
      print("==== appController didStartWithSuccess -- \(success)")
      onDidStart?()
  }
}
