// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "BrownfieldBundleSupport",
  platforms: [
    .macOS(.v13),
  ],
  products: [
    .library(
      name: "BrownfieldBundleSupport",
      targets: ["BrownfieldBundleSupport"]
    ),
  ],
  targets: [
    .target(
      name: "BrownfieldBundleSupport",
      path: ".",
      exclude: [
        "ExpoHostRuntime.swift",
        "JSBundleLoadObserver.swift",
        "Notification+Brownfield.swift",
        "ReactNativeBrownfield.swift",
        "ReactNativeBrownfield.xcodeproj",
        "ReactNativeBrownfieldModule.h",
        "ReactNativeBrownfieldModule.mm",
        "ReactNativeBrownfieldModule.swift",
        "ReactNativeHostRuntime.swift",
        "ReactNativeView.swift",
        "ReactNativeViewController.swift",
        "Tests",
      ],
      sources: [
        "BrownfieldBundlePathResolver.swift",
        "BrownfieldBundleURLResolver.swift",
      ]
    ),
    .testTarget(
      name: "BrownfieldBundleSupportTests",
      dependencies: ["BrownfieldBundleSupport"],
      path: "Tests",
      resources: [
        .copy("Fixtures/main.jsbundle"),
      ]
    ),
  ]
)
