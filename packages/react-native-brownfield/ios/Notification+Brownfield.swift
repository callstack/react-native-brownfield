import Foundation

extension Notification.Name {
  /**
   * Notification sent when React Native wants to navigate back to native screen.
   */
  public static let popToNative = Notification.Name("PopToNativeNotification")
  /**
   * Notification sent to enable/disable the pop gesture recognizer.
   */
  public static let togglePopGestureRecognizer = Notification.Name("TogglePopGestureRecognizerNotification")
  /**
   * Notification sent when JS calls postMessage. UserInfo contains "message" key.
   */
  public static let brownfieldMessageFromJS = Notification.Name("BrownfieldMessageFromJSNotification")
  /**
   * Notification sent by native code to forward a message to JS. UserInfo contains "message" key.
   */
  public static let brownfieldMessageToJS = Notification.Name("BrownfieldMessageToJSNotification")
}
