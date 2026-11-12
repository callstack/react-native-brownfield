import SharedRNApp from '@callstack/shared-runtime/expo/RNApp';
import type { ComponentProps } from 'react';

export default function RNApp(
  props: Omit<
    ComponentProps<typeof SharedRNApp>,
    'sdkVersion' | 'showPopToNative'
  >
) {
  return <SharedRNApp {...props} sdkVersion={58} />;
}
