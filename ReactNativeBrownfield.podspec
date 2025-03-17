require 'json'

is_new_arch_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
new_arch_enabled_flag = (is_new_arch_enabled ? " -DRCT_NEW_ARCH_ENABLED" : "")
other_cflags = "$(inherited)" + new_arch_enabled_flag

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = "ReactNativeBrownfield"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "9.0"

  # s.source       = { :git => "git@github.com/michalchudziak/react-native-brownfield.git", :tag => "v#{s.version}" }
  spec.source       = { :path => "." }
  spec.source_files  = "ios/**/*.{h,m,mm,swift}"
  spec.compiler_flags = new_arch_enabled_flag
  spec.pod_target_xcconfig = { 'OTHER_CPLUSPLUSFLAGS' => other_cflags, 'DEFINES_MODULE' => 'YES' }

  install_modules_dependencies(spec)
  spec.dependency 'ReactAppDependencyProvider'
end
