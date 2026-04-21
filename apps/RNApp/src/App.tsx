import '../BrownfieldStore.brownie';

import { NavigationContainer } from '@react-navigation/native';

import { HomeScreen } from './HomeScreen';
import { NativeOsVersionLabelContext } from './nativeHostContext';
import { Stack } from './navigation/RootStack';

type AppProps = {
  nativeOsVersionLabel?: string;
};

export default function App({ nativeOsVersionLabel }: AppProps) {
  return (
    <NativeOsVersionLabelContext.Provider value={nativeOsVersionLabel}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </NativeOsVersionLabelContext.Provider>
  );
}
