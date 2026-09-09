import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  Platform: { OS: 'ios' },
  markFullyDisplayed: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: native.Platform,
  NativeModules: {
    BrownfieldPerformance: { markFullyDisplayed: native.markFullyDisplayed },
  },
}));
vi.mock('../NativeReactNativeBrownfieldModule', () => ({ default: {} }));

import ReactNativeBrownfield from '../index';

describe('markFullyDisplayed', () => {
  beforeEach(() => {
    native.Platform.OS = 'ios';
    native.markFullyDisplayed.mockClear();
  });

  it('forwards the presentation ID to the iOS module', () => {
    ReactNativeBrownfield.markFullyDisplayed('presentation-123');
    expect(native.markFullyDisplayed).toHaveBeenCalledExactlyOnceWith(
      'presentation-123'
    );
  });

  it('does not access a native performance API on Android', () => {
    native.Platform.OS = 'android';
    ReactNativeBrownfield.markFullyDisplayed('presentation-123');
    expect(native.markFullyDisplayed).not.toHaveBeenCalled();
  });
});
