import { Platform } from 'react-native';
import ReactNativeBrownfieldModule from './NativeReactNativeBrownfieldModule';

const ReactNativeBrownfield = {
  popToNative: (animated?: boolean): void => {
    if (Platform.OS === 'ios') {
      ReactNativeBrownfieldModule.popToNative(!!animated);
    } else if (Platform.OS === 'android') {
      ReactNativeBrownfieldModule.popToNative(false);
    } else {
      console.warn('Not implemented: popToNative');
    }
  },

  setNativeBackGestureAndButtonEnabled: (enabled: boolean): void => {
    if (Platform.OS === 'ios') {
      ReactNativeBrownfieldModule.setPopGestureRecognizerEnabled(enabled);
    } else if (Platform.OS === 'android') {
      ReactNativeBrownfieldModule.setHardwareBackButtonEnabled(enabled);
    } else {
      console.warn('Not implemented: setNativeGesturesAndButtonsEnabled');
    }
  },
};

export default ReactNativeBrownfield;
