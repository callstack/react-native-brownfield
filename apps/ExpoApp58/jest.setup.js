require('@callstack/shared-tests/jest/setup');

// postMessage tab reads safe-area insets; tests render it without a SafeAreaProvider.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default
);
