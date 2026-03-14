import SwiftUI
import Brownie

struct GreetingCard: View {
    let name: String
    @UseStore(\BrownfieldStore.counter) var counter

    var body: some View {
        MaterialCard {
            Text("Hello native \(name) 👋")
                .font(.title3)
                .multilineTextAlignment(.center)

            Text(
                "You clicked the button \(Int(counter)) time\(counter == 1 ? "" : "s")"
            )
            .multilineTextAlignment(.center)
            .font(.body)

            Button("Increment counter") {
                $counter.set { $0 + 1 }
            }
            .buttonStyle(.borderedProminent)
        }
    }
}
