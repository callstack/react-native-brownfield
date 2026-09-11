import UIKit

@main struct PerformanceBridgeTests {
  static func main() {
    var result: BrownfieldDisplayMetrics?
    let session = BrownfieldDisplaySession(moduleName: "RN086", waitForFullDisplay: false,
      collectThreadMetrics: true) { result = $0 }
    let jsThread = Thread {
      // Reproduce RCTJSThreadManager's run loop and RN 0.86's payloadless afterLoad event.
      var context = CFRunLoopSourceContext()
      let source = CFRunLoopSourceCreate(nil, 0, &context)!
      CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .defaultMode)
      NotificationCenter.default.post(name: Notification.Name("RCTInstanceDidLoadBundle"), object: nil)
      while !Thread.current.isCancelled {
        CFRunLoopRunInMode(.defaultMode, 0.01, false)
      }
      CFRunLoopRemoveSource(CFRunLoopGetCurrent(), source, .defaultMode)
    }
    jsThread.start()
    RunLoop.main.run(until: Date().addingTimeInterval(0.2))
    // RN 0.87 emits a second notification. It must not cancel the measured presentation.
    NotificationCenter.default.post(name: Notification.Name("RCTJavaScriptDidLoadNotification"), object: nil)
    session.appeared()
    guard let metrics = result?.initialDisplay else {
      preconditionFailure("The presentation must complete after both load notifications")
    }
    precondition(metrics.jsThread.sampledMs > 0, "The real JS sampler must start")
    precondition(metrics.jsThread.fps != nil && metrics.jsThread.busyRatio != nil,
                 "JS metrics must be available without a bridge payload")
    precondition(metrics.uiThread.sampledMs > 0 && metrics.uiThread.fps != nil)
    NotificationCenter.default.post(name: Notification.Name("BrownfieldPerformanceStop"), object: nil)
    jsThread.cancel()
    print("PASS: production dispatcher + display session; JS sampledMs=\(metrics.jsThread.sampledMs), frames=\(metrics.jsThread.frameCount)")
  }
}
