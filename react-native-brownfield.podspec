require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = "react-native-brownfield"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "14.0"

  spec.module_name = "react_native_brownfield"
  spec.source       = { :git => "git@github.com:callstack/react-native-brownfield.git", :tag => "#{spec.version}" }
  spec.source_files  = "ios/**/*.{h,m,mm,swift}"
  spec.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  spec.dependency 'ReactAppDependencyProvider'
  install_modules_dependencies(spec)
end
