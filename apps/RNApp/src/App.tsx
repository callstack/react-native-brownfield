import '../BrownfieldStore.brownie';

import { NavigationContainer } from '@react-navigation/native';

import { Stack } from './navigation/RootStack';
import { HomeScreen } from './HomeScreen';

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
