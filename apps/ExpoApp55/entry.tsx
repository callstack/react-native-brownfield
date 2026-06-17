import { ExpoRoot } from 'expo-router';
import { AppRegistry } from 'react-native';

function App() {
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

// AppleApp brownfield embeds the module named `RNApp`; mount the full Expo Router tree.
AppRegistry.registerComponent('RNApp', () => App);
AppRegistry.registerComponent('main', () => App);
