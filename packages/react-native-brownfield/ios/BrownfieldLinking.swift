import UIKit
internal import React

enum BrownfieldLinking {
  private static let openURLNotification = Notification.Name("RCTOpenURLNotification")

  static func open(
    _ app: UIApplication,
    url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any]
  ) -> Bool {
    if RCTLinkingManager.application(app, open: url, options: options) {
      return true
    }
    postOpenURLNotification(url)
    return true
  }

  static func continueUserActivity(
    _ application: UIApplication,
    userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    ) {
      return true
    }
    guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
          let url = userActivity.webpageURL
    else {
      return false
    }
    postOpenURLNotification(url)
    return true
  }

  private static func postOpenURLNotification(_ url: URL) {
    NotificationCenter.default.post(
      name: openURLNotification,
      object: nil,
      userInfo: ["url": url.absoluteString]
    )
  }
}
