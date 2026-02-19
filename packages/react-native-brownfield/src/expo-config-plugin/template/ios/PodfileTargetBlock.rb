  # Brownfield framework target for packaging as XCFramework
  target '{{FRAMEWORK_NAME}}' do
    ENV['REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST'] = '1'
    inherit! :complete
  end
