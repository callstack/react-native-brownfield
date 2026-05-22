import type { ComponentProps } from 'react';
import { AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RNApp from './RNApp';

type RNAppRootProps = ComponentProps<typeof RNApp>;

function RNAppRoot(props: RNAppRootProps) {
  return (
    <SafeAreaProvider>
      <RNApp {...props} />
    </SafeAreaProvider>
  );
}

AppRegistry.registerComponent('RNApp', () => RNAppRoot);
// Standalone `expo run:ios` / Detox load the `main` key — same root as brownfield `RNApp`.
AppRegistry.registerComponent('main', () => RNAppRoot);
