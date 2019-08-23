/* @flow */
import {NativeModules, Platform} from 'react-native';

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
};
