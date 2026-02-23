import { ExpoRoot } from 'expo-router';
import { AppRegistry } from 'react-native';
import RNApp from './RNApp';

function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

AppRegistry.registerComponent('RNApp', () => RNApp);
// Keep compatibility with Expo's default app key.
AppRegistry.registerComponent('main', () => App);
