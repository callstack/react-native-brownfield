import React from 'react';
import {AppRegistry, StyleSheet, Text, View, NativeModules, Button, Image} from 'react-native';
import { createStackNavigator, createAppContainer } from 'react-navigation';

const getRandomTheme = () => {
  const getRandomValue = () => Math.round(Math.random() * 255);

  const primary = [getRandomValue(), getRandomValue(), getRandomValue()];
  const secondary = [255 - primary[0], 255 - primary[1], 255 - primary[2]];

  return {
    primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
    secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
  };
}

class HomeScreen extends React.Component {
  static navigationOptions = {
    header: null,
  }

  render() {
    const colors = this.props.navigation.getParam('theme', getRandomTheme());

    return (
      <View style={[styles.container, {backgroundColor: colors.primary}]}>
        <Text style={[styles.text, {color: colors.secondary}]}>React Native Screen</Text>

        <Button
          onPress={() => { NativeModules.ReactNativeBrownfield.setPopGestureRecognizer(false) }}
          color={colors.secondary}
          title="Disable back gesture"
        />

        <Button
          onPress={() => { NativeModules.ReactNativeBrownfield.popToNative(true) }}
          color={colors.secondary}
          title="Pop to native"
        />

        <Button
          onPress={() => {
            this.props.navigation.push('Home', {
              theme: getRandomTheme(),
            });
          }}
          color={colors.secondary}
          title="Push next screen"
        />
      </View>
    );
  }
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

const AppNavigator = createStackNavigator({
  Home: {
    screen: HomeScreen
  }
});

const App = createAppContainer(AppNavigator);

AppRegistry.registerComponent('ReactNative', () => App);