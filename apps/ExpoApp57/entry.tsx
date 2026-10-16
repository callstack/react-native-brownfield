import { ExpoRoot } from 'expo-router';
import { AppRegistry } from 'react-native';

import RNApp from './RNApp';
import { useMarkFullyDisplayed } from './src/hooks/use-mark-fully-displayed';

function App({
  brownfieldPresentationID,
}: {
  brownfieldPresentationID?: string;
}) {
  useMarkFullyDisplayed(brownfieldPresentationID);

  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

// AppleApp brownfield embeds the module named `RNApp`; mount the full Expo Router tree.
AppRegistry.registerComponent('RNApp', () => RNApp);
// Keep compatibility with Expo's default app key.
AppRegistry.registerComponent('main', () => App);
