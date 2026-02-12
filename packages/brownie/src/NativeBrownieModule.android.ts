import type { TurboModule, CodegenTypes } from 'react-native';

export interface Spec extends TurboModule {
  nativeStoreDidChange: CodegenTypes.EventEmitter<{
    key: string;
    value: string;
  }>;
}

export default {
  nativeStoreDidChange: () => ({}),
};
