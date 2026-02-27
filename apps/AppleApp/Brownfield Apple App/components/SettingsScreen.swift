import SwiftUI

struct SettingsScreen: View {
    var body: some View {
        Form {
            Section("Preferences") {
                Toggle("Enable notifications", isOn: .constant(true))
                Toggle("Dark mode", isOn: .constant(false))
            }

            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Settings")
    }
}