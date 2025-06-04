import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type Primitive = string | number | boolean | bigint;

export type PrimitiveObject = {
  [key: string]: Primitive | PrimitiveObject | Primitive[] | PrimitiveObject[];
};

export interface Spec extends TurboModule {
  /**
   * Navigate back to the native part of the application.
   */
  popToNative(animated: boolean, result?: PrimitiveObject): void;

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
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeBrownfield');
