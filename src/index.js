/* @flow */
import {
  NativeModules,
  Platform,
  AppRegistry,
  View,
  Text,
  requireNativeComponent,
} from 'react-native';

const NativeChildren = requireNativeComponent('ChildrenView');

// Testing
import React from 'react';

const GreenSquare = ({style, uuid, text, hasChildren, ...passProps}) => (
  <View style={[{flex: 1, backgroundColor: 'green'}, style]} {...passProps}>
    {console.log(uuid, hasChildren)}
    {hasChildren && <NativeChildren style={{flex: 1}} uuid={uuid} />}
  </View>
);

const RedSquare = ({style, uuid, text, ...passProps}) => (
  <View style={[{flex: 1, backgroundColor: 'red'}, style]} {...passProps}>
    <Text
      onPress={() => {
        NativeModules.ReactNativeBrownfield.handleCallback(uuid, 'onPress');
      }}>
      {text}
    </Text>
  </View>
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
