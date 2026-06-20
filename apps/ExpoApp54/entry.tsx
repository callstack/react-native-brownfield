import { ExpoRoot } from 'expo-router';
import { useEffect } from 'react';
import { AppRegistry } from 'react-native';
import {
  syncBrownfieldE2EModeFromRootProps,
  type BrownfieldRootProps,
} from '@callstack/brownfield-example-shared-tests';

function App(props: BrownfieldRootProps) {
  useEffect(() => {
    syncBrownfieldE2EModeFromRootProps(props);
    return () => syncBrownfieldE2EModeFromRootProps(undefined);
  }, [props.brownfieldE2E]);

  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

// AppleApp brownfield embeds the module named `RNApp`; mount the full Expo Router tree.
AppRegistry.registerComponent('RNApp', () => App);
AppRegistry.registerComponent('main', () => App);
