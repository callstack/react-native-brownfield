import type { BrownfieldRootProps } from '@callstack/shared-runtime';
import type { ComponentType } from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import BrownfieldNavigation from '@callstack/brownfield-navigation';

type RNAppProps = BrownfieldRootProps;

function resetBrownieExampleStore() {
  const g = globalThis as typeof globalThis & {
    __resetBrownieExampleStore?: () => void;
  };
  g.__resetBrownieExampleStore?.();
}

const brownfieldNavigation = BrownfieldNavigation as unknown as {
  navigateToSettings: jest.Mock;
  navigateToReferrals: jest.Mock;
};

/**
 * Root RN surface used by Expo brownfield examples (navigation + counter).
 */
export function runExpoRnAppSuite(
  appLabel: string,
  RNApp: ComponentType<RNAppProps>,
  sdkVersion: number
) {
  describe(`Expo RNApp — ${appLabel}`, () => {
    beforeEach(() => {
      resetBrownieExampleStore();
      jest.clearAllMocks();
    });

    it('calls native navigation when opening settings and referrals', () => {
      render(<RNApp />);

      fireEvent.press(screen.getByText('Navigate to Settings'));
      expect(brownfieldNavigation.navigateToSettings).toHaveBeenCalledWith({
        id: 'expo-user-123',
        name: 'Expo User',
        flags: [`expo${sdkVersion}`],
        ids: ['expo-user-123'],
      });

      fireEvent.press(screen.getByText('Navigate to Referrals'));
      expect(brownfieldNavigation.navigateToReferrals).toHaveBeenCalledWith(
        '123'
      );
    });

    it('preserves the SDK-specific native action', () => {
      render(<RNApp />);
      const button = screen.queryByText('Pop To Native');
      if (sdkVersion === 57) {
        expect(button).toBeTruthy();
        fireEvent.press(button!);
        expect(ReactNativeBrownfield.popToNative).toHaveBeenCalledWith(true);
      } else {
        expect(button).toBeNull();
      }
    });

    it('renders the native OS version label when provided', () => {
      render(<RNApp nativeOsVersionLabel="iOS 18" />);

      expect(screen.getByText('iOS 18')).toBeTruthy();
    });
  });
}
