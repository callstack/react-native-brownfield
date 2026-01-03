import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import { NavigationContainer } from '@react-navigation/native';

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

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation, route }: Props) {
  const colors = route.params?.theme || getRandomTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const isFirstRoute = !navigation.canGoBack();
      ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(isFirstRoute);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={[styles.text, { color: colors.secondary }]}>
        React Native Screen
      </Text>

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
type RootStackParamList = {
  Home: { theme: { primary: string; secondary: string } };
};

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
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
});
