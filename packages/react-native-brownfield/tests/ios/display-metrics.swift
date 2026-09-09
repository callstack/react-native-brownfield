import UIKit

@main struct DisplayMetricsTests {
  static func main() {
    for hz in [60.0, 120.0] {
      var samples = BrownfieldFrameSamples()
      precondition(samples.snapshot(at: 1).fps == nil)
      samples.begin(at: 0)
      for frame in 1...Int(hz) {
        samples.record(at: Double(frame) / hz, frameInterval: 1 / hz)
      }
      let smooth = samples.snapshot(at: 1)
      precondition(abs(smooth.fps!.doubleValue - hz) < 0.001)
      precondition(smooth.busyRatio!.doubleValue < 0.001)
      precondition(smooth.sampledMs == 1000)
      let stalled = samples.snapshot(at: 2)
      precondition(abs(stalled.fps!.doubleValue - hz / 2) < 0.001)
      precondition(stalled.busyRatio!.doubleValue > 0.49)
      // Reading a snapshot does not mutate already delivered results.
      precondition(smooth.busyRatio!.doubleValue < 0.001)
    }

    var callbacks: [BrownfieldDisplayMetrics] = []
    let immediate = BrownfieldDisplaySession(moduleName: "Immediate", waitForFullDisplay: false) {
      callbacks.append($0)
    }
    immediate.appeared()
    immediate.appeared()
    precondition(callbacks.count == 1, "A presentation completes only once")
    let first = callbacks[0]
    precondition(first.isFinal && !first.isCancelled)
    precondition(first.initialDisplay === first.fullDisplay, "Default TTFD exactly equals TTID")
    precondition(first.initialDisplay!.jsThread.fps == nil)
    precondition(first.initialDisplay!.uiThread.fps == nil)
    precondition(first.initialDisplay!.uiThread.busyRatio == nil)
    precondition(first.initialDisplay!.jsThread.sampledMs == 0)
    precondition(first.initialDisplay!.uiThread.sampledMs == 0, "Thread collection is off by default")

    callbacks.removeAll()
    let waiting = BrownfieldDisplaySession(moduleName: "SameModule", waitForFullDisplay: true,
      collectThreadMetrics: true) {
      callbacks.append($0)
    }
    let other = BrownfieldDisplaySession(moduleName: "SameModule", waitForFullDisplay: true) {
      callbacks.append($0)
    }
    waiting.appeared()
    other.appeared()
    precondition(callbacks.isEmpty)
    NotificationCenter.default.post(name: Notification.Name("BrownfieldMarkFullyDisplayed"), object: "stale")
    precondition(callbacks.isEmpty, "Stale IDs do not complete any presentation")
    Thread.sleep(forTimeInterval: 0.03)
    NotificationCenter.default.post(name: Notification.Name("BrownfieldMarkFullyDisplayed"), object: waiting.id)
    precondition(callbacks.count == 1 && callbacks[0].presentationID == waiting.id)
    precondition(callbacks[0].fullDisplay!.duration > callbacks[0].initialDisplay!.duration)
    precondition(callbacks[0].fullDisplay!.jsThread.fps == nil, "Missing JS coverage must remain unavailable")
    precondition(callbacks[0].fullDisplay!.uiThread.busyRatio!.doubleValue > 0,
                 "Snapshot includes an outstanding main-thread stall")
    NotificationCenter.default.post(name: Notification.Name("BrownfieldMarkFullyDisplayed"), object: waiting.id)
    precondition(callbacks.count == 1, "Duplicate completion is ignored")
    other.cancel()
    NotificationCenter.default.post(name: Notification.Name("BrownfieldMarkFullyDisplayed"), object: other.id)
    precondition(callbacks.count == 1, "Cancelled presentations never complete")

    callbacks.removeAll()
    let early = BrownfieldDisplaySession(moduleName: "Early", waitForFullDisplay: true) {
      callbacks.append($0)
    }
    NotificationCenter.default.post(name: Notification.Name("BrownfieldMarkFullyDisplayed"), object: early.id)
    precondition(callbacks.isEmpty, "JS readiness cannot precede native appearance")
    early.appeared()
    precondition(callbacks.count == 1)
    precondition(callbacks[0].fullDisplay!.duration >= callbacks[0].initialDisplay!.duration)

    let stopped = BrownfieldDisplaySession(moduleName: "Stopped", waitForFullDisplay: true) { _ in
      preconditionFailure("Stopping RN must cancel the pending callback")
    }
    NotificationCenter.default.post(name: Notification.Name("BrownfieldPerformanceStop"), object: nil)
    stopped.appeared()
    NotificationCenter.default.post(name: Notification.Name("BrownfieldMarkFullyDisplayed"), object: stopped.id)

    weak var released: BrownfieldDisplaySession?
    autoreleasepool {
      var session: BrownfieldDisplaySession? = BrownfieldDisplaySession(moduleName: "Released",
        waitForFullDisplay: true, collectThreadMetrics: true, callback: nil)
      released = session
      session = nil
    }
    precondition(released == nil, "An unused measurement must not retain a presentation")
    print("PASS: display lifecycle, full-display ordering, isolation, stalls, cancellation, release")
  }
}
