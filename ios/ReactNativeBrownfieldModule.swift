import React

@objcMembers
public class ReactNativeBrownfieldModuleImpl: NSObject {
  static public func setPopGestureRecognizerEnabled(_ enabled: Bool) {
    let userInfo = ["enabled": enabled]
    NotificationCenter.default.post(name: Notification.Name.togglePopGestureRecognizer, object: nil, userInfo: userInfo)
  }
  
  static public func popToNative(animated: Bool) {
    let userInfo = ["animated": animated]
    NotificationCenter.default.post(name: Notification.Name.popToNative, object: nil, userInfo: userInfo)
  }
}
