import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  nativeStoreDidChange: CodegenTypes.EventEmitter<{
    key: string;
    value: string;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Brownie');
