import UIKit

/// Frame cadence, not CPU utilization. A missing sampler produces nil FPS/busyRatio.
@objcMembers public final class BrownfieldThreadMetrics: NSObject {
  public let fps: NSNumber?
  public let busyRatio: NSNumber?
  public let sampledMs: Double
  public let frameCount: Int

  internal init(fps: Double?, busyRatio: Double?, sampledMs: Double, frameCount: Int) {
    self.fps = fps.map { NSNumber(value: $0) }
    self.busyRatio = busyRatio.map { NSNumber(value: $0) }
    self.sampledMs = sampledMs
    self.frameCount = frameCount
  }
}

@objcMembers public final class BrownfieldDisplayInterval: NSObject {
  public let duration: Double
  public let jsThread: BrownfieldThreadMetrics
  public let uiThread: BrownfieldThreadMetrics

  internal init(duration: Double, jsThread: BrownfieldThreadMetrics, uiThread: BrownfieldThreadMetrics) {
    self.duration = duration
    self.jsThread = jsThread
    self.uiThread = uiThread
  }
}

/// An immutable completed snapshot, delivered once through onMetrics.
@objcMembers public final class BrownfieldDisplayMetrics: NSObject {
  public let presentationID: String
  public let moduleName: String
  public let initialDisplay: BrownfieldDisplayInterval?
  public let fullDisplay: BrownfieldDisplayInterval?
  public let isFinal: Bool
  public let isCancelled: Bool

  internal init(presentationID: String, moduleName: String, initialDisplay: BrownfieldDisplayInterval?,
                fullDisplay: BrownfieldDisplayInterval?, isFinal: Bool, isCancelled: Bool = false) {
    self.presentationID = presentationID
    self.moduleName = moduleName
    self.initialDisplay = initialDisplay
    self.fullDisplay = fullDisplay
    self.isFinal = isFinal
    self.isCancelled = isCancelled
  }
}

/// Pure cadence accumulator, kept separate from run-loop and locking mechanics.
internal struct BrownfieldFrameSamples {
  var start: CFTimeInterval?
  var last: CFTimeInterval = 0
  var budget: CFTimeInterval = 1 / 60
  var frames = 0
  var busy: CFTimeInterval = 0

  mutating func begin(at now: CFTimeInterval) {
    start = now
    last = now
  }

  mutating func record(at now: CFTimeInterval, frameInterval: CFTimeInterval) {
    budget = max(frameInterval, 1 / 240)
    busy += max(0, now - last - budget)
    frames += 1
    last = now
  }

  func snapshot(at now: CFTimeInterval) -> BrownfieldThreadMetrics {
    guard let start, now > start else {
      return BrownfieldThreadMetrics(fps: nil, busyRatio: nil, sampledMs: 0, frameCount: 0)
    }
    let elapsed = now - start
    let blocked = busy + max(0, now - last - budget)
    return BrownfieldThreadMetrics(fps: Double(frames) / elapsed,
      busyRatio: min(1, blocked / elapsed), sampledMs: elapsed * 1000, frameCount: frames)
  }
}

/// Lock protects the JS run-loop sampler from main-thread snapshots and cancellation.
internal final class BrownfieldFrameSampler: NSObject {
  private let lock = NSLock()
  private var link: CADisplayLink?
  private var stopped = false
  private var samples = BrownfieldFrameSamples()

  func startOnCurrentRunLoop() {
    lock.lock()
    defer { lock.unlock() }
    guard !stopped, link == nil else { return }
    samples.begin(at: CACurrentMediaTime())
    let link = CADisplayLink(target: self, selector: #selector(tick(_:)))
    self.link = link
    link.add(to: .current, forMode: .common)
  }

  @objc private func tick(_ link: CADisplayLink) {
    lock.lock()
    defer { lock.unlock() }
    guard !stopped else { return }
    samples.record(at: CACurrentMediaTime(), frameInterval: link.targetTimestamp - link.timestamp)
  }

  func snapshot(at now: CFTimeInterval) -> BrownfieldThreadMetrics {
    lock.lock()
    defer { lock.unlock() }
    return samples.snapshot(at: now)
  }

  func stop() {
    lock.lock()
    stopped = true
    let oldLink = link
    link = nil
    lock.unlock()
    oldLink?.invalidate()
  }
}

/// All session state belongs to the main thread. The JS sampler alone crosses threads.
internal final class BrownfieldDisplaySession {
  let id = UUID().uuidString
  let moduleName: String
  private let waitForFullDisplay: Bool
  private var callback: ((BrownfieldDisplayMetrics) -> Void)?
  private let start = CACurrentMediaTime()
  private let ui: BrownfieldFrameSampler?
  private let js: BrownfieldFrameSampler?
  private var initial: BrownfieldDisplayInterval?
  private var fullWasMarked = false
  private var finished = false
  private var jsScheduled = false
  private var tokens: [NSObjectProtocol] = []

  init(moduleName: String, waitForFullDisplay: Bool, collectThreadMetrics: Bool = false, callback: ((BrownfieldDisplayMetrics) -> Void)?) {
    precondition(Thread.isMainThread)
    self.moduleName = moduleName
    self.waitForFullDisplay = waitForFullDisplay
    self.callback = callback
    let shouldSample = collectThreadMetrics && callback != nil
    ui = shouldSample ? BrownfieldFrameSampler() : nil
    js = shouldSample ? BrownfieldFrameSampler() : nil
    guard callback != nil else {
      finished = true
      return
    }
    ui?.startOnCurrentRunLoop()
    scheduleJS()
    if js != nil {
      tokens.append(NotificationCenter.default.addObserver(
        forName: Notification.Name("BrownfieldPerformanceBridgeReady"), object: nil, queue: .main
      ) { [weak self] _ in
        guard let self else { return }
        if self.jsScheduled { self.cancel() } else { self.scheduleJS() }
      })
    }
    if waitForFullDisplay {
      tokens.append(NotificationCenter.default.addObserver(
        forName: Notification.Name("BrownfieldMarkFullyDisplayed"), object: nil, queue: .main
      ) { [weak self] notification in
        guard let self, notification.object as? String == self.id, !self.finished else { return }
        self.fullWasMarked = true
        if self.initial != nil { self.complete() }
      })
    }
    // Cancellation releases samplers when the application stops drawing.
    tokens.append(NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
    ) { [weak self] _ in self?.cancel() })
    tokens.append(NotificationCenter.default.addObserver(
      forName: Notification.Name("RCTJavaScriptDidFailToLoadNotification"), object: nil, queue: .main
    ) { [weak self] _ in self?.cancel() })
    tokens.append(NotificationCenter.default.addObserver(
      forName: Notification.Name("BrownfieldPerformanceStop"), object: nil, queue: .main
    ) { [weak self] _ in self?.cancel() })
  }

  private func scheduleJS() {
    guard !finished, !jsScheduled, let sampler = js else { return }
    jsScheduled = BrownfieldPerformanceBridge.dispatch(toJavaScript: {
      sampler.startOnCurrentRunLoop()
    })
  }

  private func interval() -> BrownfieldDisplayInterval {
    let now = CACurrentMediaTime()
    return BrownfieldDisplayInterval(duration: (now - start) * 1000,
      jsThread: js?.snapshot(at: now) ?? BrownfieldFrameSamples().snapshot(at: now),
      uiThread: ui?.snapshot(at: now) ?? BrownfieldFrameSamples().snapshot(at: now))
  }

  func appeared() {
    guard !finished, initial == nil else { return }
    initial = interval()
    if !waitForFullDisplay || fullWasMarked {
      complete()
    }
  }

  private func complete() {
    guard !finished, let initial else { return }
    let full = waitForFullDisplay ? interval() : initial
    finished = true
    let result = BrownfieldDisplayMetrics(presentationID: id, moduleName: moduleName,
      initialDisplay: initial, fullDisplay: full, isFinal: true)
    let completion = callback
    callback = nil
    stop()
    completion?(result)
  }

  func cancel() {
    guard !finished else { return }
    finished = true
    callback = nil
    stop()
  }

  private func stop() {
    ui?.stop()
    js?.stop()
    tokens.forEach(NotificationCenter.default.removeObserver)
    tokens.removeAll()
  }

  deinit { stop() }
}

/// A child probe preserves the RN root view's type, layout, and touch handling.
internal final class BrownfieldAppearanceProbe: UIView {
  let session: BrownfieldDisplaySession
  var usesControllerAppearance = false
  private var hasAttached = false

  init(session: BrownfieldDisplaySession) {
    self.session = session
    super.init(frame: .zero)
    isUserInteractionEnabled = false
    isHidden = true
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      hasAttached = true
      if !usesControllerAppearance {
        DispatchQueue.main.async { [weak self] in
          guard let self, self.window != nil else { return }
          self.session.appeared()
        }
      }
    } else if hasAttached {
      session.cancel()
    }
  }
}
