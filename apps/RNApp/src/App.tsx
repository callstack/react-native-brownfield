import { NavigationContainer } from '@react-navigation/native';

import { HomeScreen } from '@callstack/brownfield-shared/HomeScreen';

import { Stack } from './navigation/RootStack';

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
