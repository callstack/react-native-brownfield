/* @flow */
import {NativeModules, Platform, AppRegistry, View, Text} from 'react-native';

// Testing
import React from 'react';

const GreenSquare = ({style, ...passProps}) => (
  <View style={[{flex: 1, backgroundColor: 'green'}, style]} {...passProps} />
);

const RedSquare = ({style, ...passProps}) => (
  <View style={[{flex: 1, backgroundColor: 'red'}, style]} {...passProps} />
);
// End Testing

const componentsMap = {
  GreenSquare,
  RedSquare,
};

module.exports = {
  popToNative: (animated?: boolean): void => {
    if (Platform.OS === 'ios') {
      NativeModules.ReactNativeBrownfield.popToNative(animated);
    } else if (Platform.OS === 'android') {
      NativeModules.ReactNativeBrownfield.popToNative();
    } else {
      console.warn('Not implemented: popToNative');
    }
  },

  setNativeBackGestureAndButtonEnabled: (enabled: boolean): void => {
    if (Platform.OS === 'ios') {
      NativeModules.ReactNativeBrownfield.setPopGestureRecognizerEnabled(
        enabled,
      );
    } else if (Platform.OS === 'android') {
      NativeModules.ReactNativeBrownfield.setHardwareBackButtonEnabled(enabled);
    } else {
      console.warn('Not implemented: setNativeGesturesAndButtonsEnabled');
    }
  },

  registerNativeComponents: (): void => {
    /* $FlowFixMe */
    console.disableYellowBox = true;

    Object.entries(componentsMap).forEach(
      ([name, Component]: [string, any]) => {
        AppRegistry.registerComponent(name, () => Component);
      },
    );
  },
};
