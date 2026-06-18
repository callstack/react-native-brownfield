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
            Text("Hello native \(name) 👋")
                .font(.title3)
                .multilineTextAlignment(.center)
                .accessibilityIdentifier(E2eTestIds.appleAppGreeting)

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
