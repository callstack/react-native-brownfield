import { useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput } from 'react-native';
import { useStore } from '@callstack/brownie';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import { NavigationContainer } from '@react-navigation/native';
import './BrownfieldStore.brownie';

const getRandomValue = () => Math.round(Math.random() * 255);
const getRandomTheme = () => {
  const primary = [getRandomValue(), getRandomValue(), getRandomValue()];
  const secondary = [
    255 - (primary?.[0] || 0),
    255 - (primary?.[1] || 0),
    255 - (primary?.[2] || 0),
  ];

  return {
    primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
    secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
  };
};

type RootStackParamList = {
  Home: { theme: { primary: string; secondary: string } };
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const theme = getRandomTheme();

function HomeScreen({ navigation, route }: HomeScreenProps) {
  const colors = route.params?.theme || theme;
  const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);
  const [user] = useStore('BrownfieldStore', (s) => s.user);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const isFirstRoute = !navigation.canGoBack();
      ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(isFirstRoute);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        React Native Screen
      </Text>

      <Text style={[styles.text, { color: colors.secondary }]}>
        Count: {counter}
      </Text>

      <TextInput
        style={styles.input}
        value={user.name}
        onChangeText={(text) =>
          setState((prev) => ({ user: { ...prev.user, name: text } }))
        }
        placeholder="User name"
      />

      <Button
        onPress={() => setState((prev) => ({ counter: prev.counter + 1 }))}
        color={colors.secondary}
        title="Increment"
      />

      <Button
        onPress={() => {
          navigation.push('Home', {
            theme: getRandomTheme(),
          });
        }}
        color={colors.secondary}
        title="Push next screen"
      />

      <Button
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            ReactNativeBrownfield.popToNative(true);
          }
        }}
        color={colors.secondary}
        title="Go back"
      />
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
  text: {
    fontSize: 16,
    margin: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: 200,
    marginVertical: 10,
    backgroundColor: '#fff',
  },
});
