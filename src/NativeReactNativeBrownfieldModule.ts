import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Navigate back to the native part of the application.
   */
  popToNative(animated: boolean): void;

  /**
   * Enable or disable the iOS swipe back gesture.
   * @platform ios
   */
  setPopGestureRecognizerEnabled(enabled: boolean): void;

  /**
   * Enable or disable the Android hardware back button.
   * @platform android
   */
  setHardwareBackButtonEnabled(enabled: boolean): void;

  nativeStoreDidChange: CodegenTypes.EventEmitter<{
    key: string;
    value: string;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeBrownfield');
