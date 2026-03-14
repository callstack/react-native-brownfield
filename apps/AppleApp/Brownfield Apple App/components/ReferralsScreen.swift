import SwiftUI


struct ReferralsScreen: View {
    let userId: String

    var body: some View {
        VStack(spacing: 16) {
            Text("Referrals")
                .font(.title2)
                .fontWeight(.semibold)

            Text("User ID")
                .foregroundStyle(.secondary)
            Text(userId)
                .font(.body.monospaced())
                .textSelection(.enabled)

            Button("Share referral link") {
                // Placeholder action for the sample app.
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .navigationTitle("Referrals")
    }
}