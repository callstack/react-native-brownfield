import React, {useEffect} from 'react';
import {AppRegistry, StyleSheet, Text, View, Button} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

const getRandomTheme = () => {
  const getRandomValue = () => Math.round(Math.random() * 255);

  const primary = [getRandomValue(), getRandomValue(), getRandomValue()];
  const secondary = [255 - primary[0], 255 - primary[1], 255 - primary[2]];

  return {
    primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
    secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
  };
};

function HomeScreen({navigation}) {
  const colors = navigation.params?.theme || getRandomTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', (e) => {
      const isFirstRoute = !navigation.canGoBack();
      ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(isFirstRoute);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.primary}]}>
      <Text style={[styles.text, {color: colors.secondary}]}>
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

const Stack = createNativeStackNavigator();

function App() {
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

AppRegistry.registerComponent('ReactNative', () => App);
