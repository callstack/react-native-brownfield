require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

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
  spec.private_header_files = 'ios/Private/**/*.h'
  spec.source_files  = "ios/**/*.{h,m,mm,swift}"
  spec.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'OTHER_SWIFT_FLAGS' => "-enable-experimental-feature AccessLevelOnImport"
  }

  spec.dependency 'ReactAppDependencyProvider'
  spec.dependency 'React-Core'
  add_dependency(spec, "React-RCTAppDelegate")
  
  if ENV['REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST'] == '1'
    spec.dependency 'Expo'
  end

  install_modules_dependencies(spec)
end
