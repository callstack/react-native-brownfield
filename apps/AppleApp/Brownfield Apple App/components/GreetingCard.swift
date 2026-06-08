import SwiftUI
import ReactBrownfield
import Brownie

struct GreetingCard: View {
    let name: String
    @UseStore(\BrownfieldStore.counter) var counter

    private var counterText: String {
        "You clicked the button \(Int(counter)) time\(counter == 1 ? "" : "s")"
    }

    var body: some View {
        MaterialCard {
            if E2eRuntime.isDetoxRun {
                DetoxE2eLabel(
                    text: "Hello native \(name) 👋",
                    accessibilityId: E2eTestIds.appleAppGreeting
                )
                DetoxE2eLabel(
                    text: counterText,
                    accessibilityId: E2eTestIds.appleAppNativeCounter
                )
                HStack {
                    DetoxE2eButton(
                        title: "Increment counter",
                        accessibilityId: E2eTestIds.appleAppNativeIncrement
                    ) {
                        $counter.set { $0 + 1 }
                    }
                    Button("Stop RN") {
                        ReactNativeBrownfield.shared.stopReactNative()
                    }
                    .buttonStyle(.borderedProminent)
                }
            } else {
                Text("Hello native \(name) 👋")
                    .font(.title3)
                    .multilineTextAlignment(.center)

                Text(counterText)
                    .multilineTextAlignment(.center)
                    .font(.body)

                HStack {
                    Button("Increment counter") {
                        $counter.set { $0 + 1 }
                    }
                    .buttonStyle(.borderedProminent)

                    Button("Stop RN") {
                        ReactNativeBrownfield.shared.stopReactNative()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
    }
}
