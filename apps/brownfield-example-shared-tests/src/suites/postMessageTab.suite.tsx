import type { ComponentType } from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import type { MessageEvent } from '@callstack/react-native-brownfield';

function resetBrownieExampleStore() {
  const g = globalThis as typeof globalThis & {
    __resetBrownieExampleStore?: () => void;
  };
  g.__resetBrownieExampleStore?.();
}

/**
 * Brownfield postMessage / onMessage behavior shared by Expo example postMessage tabs.
 */
export function runPostMessageTabSuite(
  appLabel: string,
  PostMessageTab: ComponentType
) {
  describe(`PostMessage tab — ${appLabel}`, () => {
    beforeEach(() => {
      resetBrownieExampleStore();
      jest.clearAllMocks();
    });

    it('subscribes to ReactNativeBrownfield.onMessage on mount and removes on unmount', () => {
      const remove = jest.fn();
      jest.mocked(ReactNativeBrownfield.onMessage).mockReturnValue({
        remove,
      });

      const { unmount } = render(<PostMessageTab />);

      expect(ReactNativeBrownfield.onMessage).toHaveBeenCalled();
      unmount();
      expect(remove).toHaveBeenCalled();
    });

    it('calls postMessage with a serializable payload when sending', () => {
      render(<PostMessageTab />);

      fireEvent.press(screen.getByText('Send message to Native'));

      expect(ReactNativeBrownfield.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/Hello from Expo!/),
          timestamp: expect.any(Number),
        })
      );
    });

    it('appends a native message when onMessage callback receives data', () => {
      let onMessageHandler: (event: MessageEvent) => void = () => {};
      jest
        .mocked(ReactNativeBrownfield.onMessage)
        .mockImplementation((cb: (event: MessageEvent) => void) => {
          onMessageHandler = cb;
          return { remove: jest.fn() };
        });

      render(<PostMessageTab />);

      act(() => {
        onMessageHandler({ data: { text: 'from native' } });
      });

      expect(screen.getByText('from native')).toBeTruthy();
    });
  });
}
