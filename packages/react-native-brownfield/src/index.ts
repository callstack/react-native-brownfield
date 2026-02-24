import { Platform, NativeEventEmitter, NativeModules } from 'react-native';

const emitter = new NativeEventEmitter(
  Platform.OS === 'ios'
    ? NativeModules.BrownfieldEventEmitter
    : NativeModules.ReactNativeBrownfield
);

import ReactNativeBrownfieldModule from './NativeReactNativeBrownfieldModule';

export interface MessageEvent {
  data: unknown;
}

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

  postMessage: (data: unknown): void => {
    const serialized = JSON.stringify(data);
    ReactNativeBrownfieldModule.postMessage(serialized);
  },

  onMessage: (
    callback: (event: MessageEvent) => void
  ): { remove: () => void } => {
    const subscription = emitter.addListener('brownfieldMessage', (raw) => {
      console.log('onMessage', raw);
      try {
        callback({ data: JSON.parse(raw) });
      } catch {
        callback({ data: raw });
      }
    });
    return { remove: () => subscription.remove() };
  },
};

export default ReactNativeBrownfield;
