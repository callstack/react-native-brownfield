import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type BrownfieldMessagePayload = {
  text: string;
};

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

  /**
   * Send a serialized JSON message to the native host application.
   */
  postMessage(message: string): void;

  // Event emitter - must be readonly
  readonly onBrownfieldMessage: CodegenTypes.EventEmitter<BrownfieldMessagePayload>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeBrownfield');
