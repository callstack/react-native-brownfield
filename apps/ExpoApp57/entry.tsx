import { ExpoRoot } from 'expo-router';
import { AppRegistry } from 'react-native';

import RNApp from './RNApp';

function App() {
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

// AppleApp brownfield embeds the module named `RNApp`; mount the full Expo Router tree.
AppRegistry.registerComponent('RNApp', () => RNApp);
// Keep compatibility with Expo's default app key.
AppRegistry.registerComponent('main', () => App);
