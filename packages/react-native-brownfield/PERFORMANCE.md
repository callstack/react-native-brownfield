# iOS performance metrics

React Native Brownfield can measure:

- React Native startup: loading and executing the JavaScript bundle.
- Screen presentation: time to initial display (TTID) and time to full display
  (TTFD).
- JavaScript and UI thread responsiveness while a screen is being presented.

The metrics are available in Debug and Release builds on iOS. Durations are in
milliseconds.

## Available metrics

| Metric                      | What it means                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `jsBundleLoadTime`          | Time spent obtaining the JavaScript bundle. This normally includes Metro and network transfer in Debug, or reading the local bundle in Release. |
| `jsBundleEvaluationTime`    | Time spent evaluating the JavaScript bundle, including synchronous top-level JavaScript work.                                                   |
| `timeline`                  | Start and stop timestamps for the completed bundle loading and execution intervals. Use it to see whether the intervals overlap.                |
| `initialDisplay.duration`   | Time to initial display (TTID): how long the native presentation takes to appear.                                                               |
| `fullDisplay.duration`      | Time to full display (TTFD): how long it takes to appear and meet the readiness condition defined by your app.                                  |
| `jsThread` / `uiThread`     | Responsiveness snapshots for the JavaScript and main UI threads during the presentation.                                                        |

Startup and screen presentation have different boundaries. Do not add their
durations together to calculate an end-to-end startup time.

## Measure React Native startup

Pass an `onBundleLoaded` callback when starting React Native:

```swift
ReactNativeBrownfield.shared.startReactNative(
  launchOptions: nil,
  preloadBundle: true
) { timings in
  print("Bundle loading: \(timings.jsBundleLoadTime as Any) ms")
  print("Bundle execution: \(timings.jsBundleEvaluationTime as Any) ms")

  for interval in timings.timeline {
    print(
      "\(interval["tag"] ?? "unknown"): " +
      "\(interval["startMs"] ?? 0)–\(interval["stopMs"] ?? 0) ms"
    )
  }
}
```

The callback runs once on the main thread after a successful bundle load. If the
bundle fails to load, it is not called. Calling `stopReactNative()` clears the
stored timings.

### What startup metrics do not measure

- `jsBundleLoadTime` is not only network or file I/O. It covers React Native's complete
  bundle-loading interval.
- `jsBundleEvaluationTime` covers synchronous bundle evaluation. It does not wait for later
  effects, requests, asynchronous work, or a screen to become ready.
- These metrics do not start at native app launch and do not represent the time
  until the user sees a screen.
- Debug and Release load different bundle sources. Compare results only under
  equivalent build and bundle conditions.

`jsBundleLoadTime` and `jsBundleEvaluationTime` are optional. `nil` means React Native did not provide a
completed measurement; it does not mean zero. The timeline omits unavailable or
incomplete intervals. Its timestamps are monotonic values for comparing entries
within the same result, not wall-clock dates.

## Measure screen presentation

Enable metrics when creating a React Native view controller:

```swift
let controller = ReactNativeViewController(
  moduleName: "Catalog",
  initialProperties: [:],
  waitForFullDisplay: true,
  collectThreadMetrics: true
) { metrics in
  guard
    let initial = metrics.initialDisplay,
    let full = metrics.fullDisplay
  else { return }

  print("TTID: \(initial.duration) ms")
  print("TTFD: \(full.duration) ms")
  print("JS FPS: \(full.jsThread.fps as Any)")
  print("UI busy ratio: \(full.uiThread.busyRatio as Any)")
}

navigationController?.pushViewController(controller, animated: true)
```

The same `waitForFullDisplay`, `collectThreadMetrics`, and `onMetrics` arguments
are available on `ReactNativeBrownfield.shared.view(...)` and SwiftUI
`ReactNativeView(...)`.

The callback returns one final result on the main thread. A presentation that is
cancelled—for example, because the controller disappears, the app moves to the
background, or React Native stops—does not call the completion callback.

### Time to initial display (TTID)

`initialDisplay.duration` measures native presentation latency. For a
`ReactNativeViewController`, it starts in `viewDidLoad` and ends when the controller
has appeared and its React Native root exists. For a raw view, it starts when
`view(...)` is called and ends just after the root attaches to a window.

TTID does not guarantee that useful React Native content has rendered. It can end
while a loading state is visible, and it does not measure physical pixel delivery.
It also excludes any time before the controller's `viewDidLoad`, such as the delay
between a user tap and controller creation.

### Time to full display (TTFD)

Set `waitForFullDisplay: true` to measure an app-defined readiness point. The
measurement completes after both conditions are true:

1. The screen has reached initial display.
2. JavaScript has called `markFullyDisplayed` for that presentation.

The root component receives a `brownfieldPresentationID` prop. Report readiness
after the content your app considers essential is available:

```tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

type Props = {
  brownfieldPresentationID: string;
  dataLoaded: boolean;
};

export function CatalogScreen({ brownfieldPresentationID, dataLoaded }: Props) {
  useEffect(() => {
    if (dataLoaded) {
      ReactNativeBrownfield.markFullyDisplayed(brownfieldPresentationID);
    }
  }, [brownfieldPresentationID, dataLoaded]);

  return <View>{/* Render the screen... */}</View>;
}
```

Choose a consistent readiness condition, such as required data and important
images being rendered. The library cannot decide when your screen is useful.
Only the first accepted marker completes the measurement.

TTFD includes TTID. Do not add them together. `TTFD - TTID` is the additional
time between initial appearance and your readiness point.

If `waitForFullDisplay` is `false` (the default), `fullDisplay` equals
`initialDisplay`; no separate readiness milestone is measured. If it is `true`
and JavaScript never sends the marker, the callback does not complete until the
presentation is cancelled.

## Measure thread responsiveness

Set `collectThreadMetrics: true` and provide an `onMetrics` callback. Each display
interval contains a `jsThread` and `uiThread` snapshot:

| Field        | What it means                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `fps`        | Average display-link callback rate during the sampled window.                                         |
| `busyRatio`  | Estimated fraction of sampled time spent beyond callback deadlines, from `0` to `1`. Lower is better. |
| `sampledMs`  | How much of the interval was actually observed.                                                       |
| `frameCount` | Number of display-link callbacks in the sample.                                                       |

Always check `sampledMs` and `frameCount` before interpreting FPS or busy ratio.
For example, if TTFD is 1,000 ms but JS `sampledMs` is 200 ms, the JS values only
describe those 200 ms. JS sampling can begin late while React Native is starting.

The initial-display snapshots cover the interval through TTID. The full-display
snapshots are cumulative from the same start through TTFD; they do not represent
only the time after TTID.

### What thread metrics do not measure

- `busyRatio` is not CPU utilization.
- `fps` is callback cadence, not React render count, dropped-frame count, or GPU
  frame delivery.
- Values are averages. A short stall can be hidden by a longer smooth interval.
- The samplers observe the shared React Native JavaScript thread and app main
  thread, so unrelated work can affect the result.
- Sampling adds a small amount of work. Keep the setting consistent when comparing
  runs.
- Unsupported or not-yet-started samplers report `nil` FPS/busy ratio and zero
  coverage. Short samples are noisy.

Use low FPS or a high busy ratio as a signal to profile the affected thread, not
as proof of the cause of a slowdown.

## Comparing results

Compare repeated measurements made with the same React Native version, build
configuration, device, bundle source, preload policy, hosting API, thread-metric
setting, and readiness condition.

These metrics describe specific parts of startup and presentation. If you need a
duration from app launch or a user interaction to useful content, instrument that
start point separately and use TTFD as the end point.
