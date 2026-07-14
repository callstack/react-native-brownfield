require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

expo_updates_installed = lambda do
  Pod::Executable.execute_command('node', [
    '-p',
    'require.resolve("expo-updates/package.json", { paths: [process.argv[1]] })',
    Pod::Config.instance.installation_root.to_s,
  ])

  true
rescue
  false
end

Pod::Spec.new do |spec|
  spec.name         = "ReactBrownfield"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "14.0"

  spec.module_name = "ReactBrownfield"
  spec.source       = { :git => "git@github.com:callstack/react-native-brownfield.git", :tag => "#{spec.version}" }
  spec.source_files  = "ios/**/*.{h,m,mm,swift}"
  spec.exclude_files = "ios/swiftpm/Package.swift", "ios/swiftpm/Tests/**/*"
  spec.pod_target_xcconfig = {
    # below: needed to build the XCFramework with `.swiftinterface` files, required by xcodebuild -create-xcframework to succeed
    'DEFINES_MODULE' => 'YES',
    'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES',
    'SWIFT_EMIT_MODULE_INTERFACE' => 'YES',
    'OTHER_SWIFT_FLAGS' => "-enable-experimental-feature AccessLevelOnImport -no-verify-emitted-module-interface"
  }

  if ENV['RCT_USE_PREBUILT_RNCORE'] == '1'
    spec.dependency 'React-Core-prebuilt'
  end

  spec.dependency 'ReactAppDependencyProvider'
  spec.dependency 'React-RCTAppDelegate'

  if ENV['REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST'] == '1'
    spec.dependency 'Expo'
    spec.dependency 'EXUpdates' if expo_updates_installed.call
  end

  install_modules_dependencies(spec)
end
