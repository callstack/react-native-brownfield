internal import React

@objcMembers
public class ReactNativeBrownfieldModuleImpl: NSObject {
  static public func setPopGestureRecognizerEnabled(_ enabled: Bool) {
    let userInfo = ["enabled": enabled]
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: Notification.Name.togglePopGestureRecognizer, object: nil, userInfo: userInfo)
    }
  }

  static public func popToNative(animated: Bool) {
    let userInfo = ["animated": animated]
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: Notification.Name.popToNative, object: nil, userInfo: userInfo)
    }
  }

  static public func postMessage(_ message: String) {
    let userInfo: [String: Any] = ["message": message]
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: Notification.Name.brownfieldMessageFromJS, object: nil, userInfo: userInfo)
    }
  }
}
