import type { ComponentType } from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import BrownfieldNavigation from '@callstack/brownfield-navigation';

type Nav = {
  addListener: (
    event: string,
    cb: () => void
  ) => (() => void) | { remove?: () => void };
  canGoBack: () => boolean;
  goBack: () => void;
  push: (name: string, params?: object) => void;
};

function resetBrownieExampleStore() {
  const g = globalThis as typeof globalThis & {
    __resetBrownieExampleStore?: () => void;
  };
  g.__resetBrownieExampleStore?.();
}

const brownfieldNavigation =
  BrownfieldNavigation as unknown as {
    navigateToSettings: jest.Mock;
    navigateToReferrals: jest.Mock;
  };

/**
 * Home screen in the plain RN example: postMessage, back gesture, popToNative, brownfield navigation.
 */
export function runHomeScreenSuite<P extends object>(
  appLabel: string,
  HomeScreen: ComponentType<P>
) {
  describe(`HomeScreen — ${appLabel}`, () => {
    const focusListeners: (() => void)[] = [];

    beforeEach(() => {
      resetBrownieExampleStore();
      focusListeners.length = 0;
      jest.clearAllMocks();
    });

    function makeNavigation(overrides: Partial<Nav> = {}): Nav {
      return {
        addListener: (event, cb) => {
          if (event === 'focus') {
            focusListeners.push(cb);
          }
          return jest.fn();
        },
        canGoBack: () => false,
        goBack: jest.fn(),
        push: jest.fn(),
        ...overrides,
      };
    }

    it('enables native back handling on focus based on whether the user can go back', () => {
      const navigation = makeNavigation({ canGoBack: () => true });
      const route = { params: undefined as { theme?: object } | undefined };

      render(<HomeScreen {...({ navigation, route } as P)} />);

      act(() => {
        focusListeners.forEach((cb) => cb());
      });

      expect(
        ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled
      ).toHaveBeenCalledWith(false);
    });

    it('sends a postMessage when the user sends a message to native', () => {
      const navigation = makeNavigation();
      const route = { params: undefined as { theme?: object } | undefined };

      render(<HomeScreen {...({ navigation, route } as P)} />);

      fireEvent.press(screen.getByText('Send message to Native'));

      expect(ReactNativeBrownfield.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/Hello from React Native/),
        })
      );
    });

    it('opens native settings and referrals via BrownfieldNavigation', () => {
      const navigation = makeNavigation();
      const route = { params: undefined as { theme?: object } | undefined };

      render(<HomeScreen {...({ navigation, route } as P)} />);

      fireEvent.press(screen.getByText('Open native settings'));
      expect(brownfieldNavigation.navigateToSettings).toHaveBeenCalled();

      fireEvent.press(screen.getByText('Open native referrals'));
      expect(brownfieldNavigation.navigateToReferrals).toHaveBeenCalledWith(
        'user-123'
      );
    });

    it('calls popToNative when Go back is pressed on the root screen', () => {
      const navigation = makeNavigation({ canGoBack: () => false });
      const route = { params: undefined as { theme?: object } | undefined };

      render(<HomeScreen {...({ navigation, route } as P)} />);

      fireEvent.press(screen.getByText('Go back'));

      expect(ReactNativeBrownfield.popToNative).toHaveBeenCalledWith(true);
    });
  });
}
