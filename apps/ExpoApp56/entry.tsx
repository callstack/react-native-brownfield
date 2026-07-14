import { ExpoRoot } from 'expo-router';
import { useEffect } from 'react';
import { AppRegistry } from 'react-native';
import {
  syncBrownfieldE2EModeFromRootProps,
  type BrownfieldRootProps,
} from '@callstack/brownfield-example-shared-tests/runtime';

function App(props: BrownfieldRootProps) {
  useEffect(() => {
    syncBrownfieldE2EModeFromRootProps(props.brownfieldE2E);
    return () => syncBrownfieldE2EModeFromRootProps(undefined);
  }, [props.brownfieldE2E]);

  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

// AppleApp brownfield embeds the module named `RNApp`; mount the full Expo Router tree.
AppRegistry.registerComponent('RNApp', () => App);
// Keep compatibility with Expo's default app key.
AppRegistry.registerComponent('main', () => App);
