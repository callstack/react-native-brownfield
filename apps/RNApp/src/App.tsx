import { NavigationContainer } from '@react-navigation/native';

import { Stack } from './navigation/RootStack';
import { RNHomeScreen } from './RNHomeScreen';

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={RNHomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
