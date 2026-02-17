import BrownfieldLib
import Brownie
import SwiftUI

let initialState = BrownfieldStore(
  counter: 0,
  user: User(name: "Username")
)

struct ContentView: View {
    var body: some View {
        NavigationView {
            MainScreen()
                .padding(16)
        }
    }
}

struct RNViewRepresentable: UIViewRepresentable {

    func makeUIView(context: Context) -> UIView {
        return ReactNativeHostManager.shared.loadView(moduleName: "RNApp", initialProps: nil, launchOptions: nil)
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        // Update the view when SwiftUI state changes
    }
}

struct MainScreen: View {
    var body: some View {
        VStack(spacing: 16) {
            GreetingCard(name: "iOS")

            RNViewRepresentable()
                .navigationBarHidden(true)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .background(Color(UIColor.systemBackground))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

struct GreetingCard: View {
    let name: String
    @UseStore(\BrownfieldStore.counter) var counter

    var body: some View {
        VStack(spacing: 12) {
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
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(16)
        .shadow(radius: 4)
    }
}

#Preview {
    ContentView()
}
