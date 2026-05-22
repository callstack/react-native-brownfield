import type { ComponentType } from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import BrownfieldNavigation from '@callstack/brownfield-navigation';

type RNAppProps = { nativeOsVersionLabel?: string };

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
 * Root RN surface used by Expo brownfield examples (navigation + counter).
 */
export function runExpoRnAppSuite(
  appLabel: string,
  RNApp: ComponentType<RNAppProps>
) {
  describe(`Expo RNApp — ${appLabel}`, () => {
    beforeEach(() => {
      resetBrownieExampleStore();
      jest.clearAllMocks();
    });

    it('calls native navigation when opening settings and referrals', () => {
      render(<RNApp />);

      fireEvent.press(screen.getByText('Navigate to Settings'));
      expect(brownfieldNavigation.navigateToSettings).toHaveBeenCalled();

      fireEvent.press(screen.getByText('Navigate to Referrals'));
      expect(brownfieldNavigation.navigateToReferrals).toHaveBeenCalledWith(
        '123'
      );
    });

    it('renders the native OS version label when provided', () => {
      render(<RNApp nativeOsVersionLabel="iOS 18" />);

      expect(screen.getByText('iOS 18')).toBeTruthy();
    });
  });
}
