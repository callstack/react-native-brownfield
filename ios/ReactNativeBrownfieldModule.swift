internal import React

@objcMembers
public class ReactNativeBrownfieldModuleImpl: NSObject {
  static public func setPopGestureRecognizerEnabled(_ enabled: Bool) {
    let userInfo = ["enabled": enabled]
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: Notification.Name.togglePopGestureRecognizer, object: nil, userInfo: userInfo)
    }
  }

  static public func popToNative(animated: Bool, result: [String: Any]?) {
    var userInfo: [String : Any] = ["animated": animated]
    if result != nil {
      userInfo["result"] = result
    }
    DispatchQueue.main.async {
      NotificationCenter.default.post(name: Notification.Name.popToNative, object: nil, userInfo: userInfo)
    }
  }
}
