import { Platform } from 'react-native';

import ReactNativeBrownfieldModule from './NativeReactNativeBrownfieldModule';
import BrownfieldNavigation from './BrownfieldNavigation';

export interface MessageEvent {
  data: unknown;
}

const ReactNativeBrownfield = {
  /**
   * Pop to the native screen.
   * @param animated - Whether to animate the transition (iOS only).
   * @platform android, ios
   * @example
   * ReactNativeBrownfield.popToNative(true);
   */
  popToNative: (animated?: boolean): void => {
    if (Platform.OS === 'ios') {
      ReactNativeBrownfieldModule.popToNative(!!animated);
    } else if (Platform.OS === 'android') {
      ReactNativeBrownfieldModule.popToNative(false);
    } else {
      console.warn('Not implemented: popToNative');
    }
  },

  /**
   * Enable or disable the iOS native back gesture and Android hardware back button.
   * @note This method is available both on the New Architecture and the Old Architecture.
   * @param enabled - Whether to enable native back gesture and button.
   * @platform android, ios
   * @example
   * ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(true);
   */
  setNativeBackGestureAndButtonEnabled: (enabled: boolean): void => {
    if (Platform.OS === 'ios') {
      ReactNativeBrownfieldModule.setPopGestureRecognizerEnabled(enabled);
    } else if (Platform.OS === 'android') {
      ReactNativeBrownfieldModule.setHardwareBackButtonEnabled(enabled);
    } else {
      console.warn('Not implemented: setNativeGesturesAndButtonsEnabled');
    }
  },

  /**
   * Send a JSON-serializable message to the native host application. This resembles the web `window.postMessage` API.
   * @note This method is available both on the New Architecture and the Old Architecture.
   * @note This method requires the `data` to be JSON-serializable. The method does not catch any serialization errors thrown
   * by the `JSON.stringify` function, this is the responsibility of the caller.
   * @param data - The data to send to the native host application.
   * @platform android, ios
   * @example
   * ReactNativeBrownfield.postMessage({ text: 'Hello from React Native!', id: 2 });
   */
  postMessage: (data: unknown): void => {
    const serialized = JSON.stringify(data);
    ReactNativeBrownfieldModule.postMessage(serialized);
  },

  /**
   * Subscribe to messages sent from the native host application. Returns a subscription object with a `remove()` method for cleanup.
   * @param callback - The callback to invoke when a message is received from the native host application.
   * @returns A subscription object with a `remove` method for cleanup.
   * @platform android, ios
   * @example
   * const subscription = ReactNativeBrownfield.onMessage((event: MessageEvent) => {
   *   console.log('Received from native:', event.data);
   * });
   *
   * // Later, to unsubscribe:
   * subscription.remove();
   */
  onMessage: (
    callback: (event: MessageEvent) => void
  ): { remove: () => void } => {
    const subscription = ReactNativeBrownfieldModule.onBrownfieldMessage(
      (payload) => {
        try {
          callback({ data: JSON.parse(payload.text) });
        } catch {
          callback({ data: payload.text });
        }
      }
    );
    return { remove: () => subscription.remove() };
  },
};

export default ReactNativeBrownfield;
export { BrownfieldNavigation };
