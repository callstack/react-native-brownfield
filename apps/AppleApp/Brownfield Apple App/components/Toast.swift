import SwiftUI

struct Toast: View {
    let message: String
    @Binding var isShowing: Bool

    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0.0

    var body: some View {
        if isShowing {
            Text(message)
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color.black.opacity(0.8))
                .cornerRadius(25)
                .multilineTextAlignment(.center)
                .scaleEffect(scale)
                .opacity(opacity)
                .onAppear {
                    // Scale-in bounce
                    withAnimation(.interpolatingSpring(stiffness: 300, damping: 15)) {
                        scale = 1.0
                        opacity = 1.0
                    }

                    // Hide after 2 seconds with scale out
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            scale = 0.5
                            opacity = 0.0
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            isShowing = false
                        }
                    }
                }
                .transition(.scale.combined(with: .opacity))
                .padding(.bottom, 50)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }
}
