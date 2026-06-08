import SwiftUI
import UIKit

enum E2eRuntime {
    static var isDetoxRun: Bool {
        ProcessInfo.processInfo.arguments.contains("-DetoxE2E")
    }
}

struct DetoxE2eButton: UIViewRepresentable {
    let title: String
    let accessibilityId: String
    let action: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(action: action)
    }

    func makeUIView(context: Context) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.accessibilityIdentifier = accessibilityId
        button.accessibilityLabel = title
        button.addTarget(
            context.coordinator,
            action: #selector(Coordinator.tap),
            for: .touchUpInside
        )
        return button
    }

    func updateUIView(_ uiView: UIButton, context: Context) {
        uiView.setTitle(title, for: .normal)
        uiView.accessibilityIdentifier = accessibilityId
        uiView.accessibilityLabel = title
    }

    final class Coordinator: NSObject {
        let action: () -> Void

        init(action: @escaping () -> Void) {
            self.action = action
        }

        @objc func tap() {
            action()
        }
    }
}

struct DetoxE2eLabel: UIViewRepresentable {
    let text: String
    let accessibilityId: String

    func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.numberOfLines = 0
        label.textAlignment = .center
        label.font = .preferredFont(forTextStyle: .body)
        label.text = text
        label.accessibilityIdentifier = accessibilityId
        label.accessibilityLabel = text
        label.isAccessibilityElement = true
        return label
    }

    func updateUIView(_ uiView: UILabel, context: Context) {
        uiView.text = text
        uiView.accessibilityLabel = text
        uiView.accessibilityIdentifier = accessibilityId
    }
}

struct DetoxE2eToast: UIViewRepresentable {
    let message: String
    let accessibilityId: String

    func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .white
        label.backgroundColor = UIColor.black.withAlphaComponent(0.8)
        label.layer.cornerRadius = 25
        label.clipsToBounds = true
        label.text = message
        label.accessibilityIdentifier = accessibilityId
        label.accessibilityLabel = accessibilityId
        label.isAccessibilityElement = true
        return label
    }

    func updateUIView(_ uiView: UILabel, context: Context) {
        uiView.text = message
    }
}
