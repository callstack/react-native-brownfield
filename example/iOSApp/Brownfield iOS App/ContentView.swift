import ReactBrownfield
import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationView {
            MainScreen()
                .padding(16)
        }
    }
}

struct MainScreen: View {
    var body: some View {
        VStack(spacing: 16) {
            GreetingCard(name: "iOS")

            ReactNativeView(moduleName: "RNApp")
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
    @State private var counter: Int = 0

    var body: some View {
        VStack(spacing: 12) {
            Text("Hello native \(name) 👋")
                .font(.title3)
                .multilineTextAlignment(.center)

            Text(
                "You clicked the button \(counter) time\(counter == 1 ? "" : "s")"
            )
            .multilineTextAlignment(.center)
            .font(.body)

            Button("Increment counter") {
                counter += 1
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
