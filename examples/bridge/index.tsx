import React from 'react';
import {AppRegistry, StyleSheet, Text, View, Button} from 'react-native';
import {
  createStackNavigator,
  NavigationStackScreenProps,
} from 'react-navigation-stack';
import {createAppContainer, NavigationEvents} from 'react-navigation';
import ReactNativeBrownfield from '@react-native-brownfield/bridge';

const getRandomTheme = () => {
  const getRandomValue = () => Math.round(Math.random() * 255);

  const primary = [getRandomValue(), getRandomValue(), getRandomValue()];
  const secondary = [255 - primary[0], 255 - primary[1], 255 - primary[2]];

  return {
    primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
    secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
  };
};

class HomeScreen extends React.Component<NavigationStackScreenProps> {
  static navigationOptions = {
    header: null,
  };

  render() {
    const colors = this.props.navigation.getParam('theme', getRandomTheme());
    const isFirstRoute = this.props.navigation.isFirstRouteInParent();

    return (
      <>
        <NavigationEvents
          onWillFocus={() => {
            ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(
              isFirstRoute,
            );
          }}
        />
        <View style={[styles.container, {backgroundColor: colors.primary}]}>
          <Text style={[styles.text, {color: colors.secondary}]}>
            React Native Screen
          </Text>

          <Button
            onPress={() => {
              this.props.navigation.push('Home', {
                theme: getRandomTheme(),
              });
            }}
            color={colors.secondary}
            title="Push next screen"
          />

          <Button
            onPress={() => {
              if (isFirstRoute) {
                ReactNativeBrownfield.popToNative(true);
              } else {
                this.props.navigation.goBack();
              }
            }}
            color={colors.secondary}
            title="Go back"
          />
        </View>
      </>
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
  // @ts-ignore
  Home: {
    screen: HomeScreen,
  },
});

const App = createAppContainer(AppNavigator);

AppRegistry.registerComponent('ReactNative', () => App);