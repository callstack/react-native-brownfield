import SwiftUI

struct MaterialCard<Content: View>: View {
    let children: Content

    init(@ViewBuilder children: () -> Content) {
        self.children = children()
    }

    var body: some View {
        VStack(spacing: 12) {
            children
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.secondarySystemBackground))
        .cornerRadius(16)
        .shadow(radius: 4)
    }
}
