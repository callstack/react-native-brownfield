import { ExpoRoot } from 'expo-router';
import { useEffect } from 'react';
import { AppRegistry } from 'react-native';
import {
  syncBrownfieldE2EModeFromRootProps,
  type BrownfieldRootProps,
} from '@callstack/brownfield-example-shared-tests/runtime';

import RNApp from './RNApp';
import { useMarkFullyDisplayed } from './src/hooks/use-mark-fully-displayed';

function App(
  props: BrownfieldRootProps & { brownfieldPresentationID?: string }
) {
  useMarkFullyDisplayed(props.brownfieldPresentationID);

  useEffect(() => {
    syncBrownfieldE2EModeFromRootProps(props.brownfieldE2E);
    return () => syncBrownfieldE2EModeFromRootProps(undefined);
  }, [props.brownfieldE2E]);

  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}

// AppleApp brownfield embeds the module named `RNApp`; mount the full Expo Router tree.
AppRegistry.registerComponent('RNApp', () => RNApp);
// Keep compatibility with Expo's default app key.
AppRegistry.registerComponent('main', () => App);
