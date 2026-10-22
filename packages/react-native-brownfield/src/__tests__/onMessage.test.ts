import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  listener: undefined as ((payload: { text: string }) => void) | undefined,
  remove: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
}));
vi.mock('../NativeReactNativeBrownfieldModule', () => ({
  default: {
    onBrownfieldMessage: (listener: (payload: { text: string }) => void) => {
      native.listener = listener;
      return { remove: native.remove };
    },
  },
}));

import ReactNativeBrownfield from '../index';

function emit(text: string) {
  native.listener?.({ text });
}

describe('onMessage', () => {
  beforeEach(() => {
    native.listener = undefined;
    native.remove.mockClear();
  });

  it('passes parsed JSON to the callback', () => {
    const callback = vi.fn();
    ReactNativeBrownfield.onMessage(callback);

    emit('{"text":"hello","id":1}');

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      data: { text: 'hello', id: 1 },
    });
  });

  it('passes the raw text when the message is not valid JSON', () => {
    const callback = vi.fn();
    ReactNativeBrownfield.onMessage(callback);

    emit('not json');

    expect(callback).toHaveBeenCalledExactlyOnceWith({ data: 'not json' });
  });

  it('does not call the callback again when it throws', () => {
    const error = new Error('callback failed');
    const callback = vi.fn(() => {
      throw error;
    });
    ReactNativeBrownfield.onMessage(callback);

    expect(() => emit('{"text":"hello"}')).toThrow(error);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      data: { text: 'hello' },
    });
  });

  it('removes the native subscription', () => {
    const subscription = ReactNativeBrownfield.onMessage(vi.fn());

    subscription.remove();

    expect(native.remove).toHaveBeenCalledOnce();
  });
});
