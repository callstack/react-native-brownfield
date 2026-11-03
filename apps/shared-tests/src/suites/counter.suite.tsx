import type { ComponentType } from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

function resetBrownieExampleStore() {
  const g = globalThis as typeof globalThis & {
    __resetBrownieExampleStore?: () => void;
  };
  g.__resetBrownieExampleStore?.();
}

/**
 * Brownfield shared-store Counter examples (Brownie useStore).
 */
export function runCounterSuite<P extends object = Record<string, never>>(
  appLabel: string,
  Counter: ComponentType<P>,
  props?: P
) {
  describe(`Counter — ${appLabel}`, () => {
    beforeEach(() => {
      resetBrownieExampleStore();
    });

    it('increments the displayed count when Increment is pressed', () => {
      const counterProps = (props ?? ({} as P)) as P;
      render(<Counter {...counterProps} />);

      expect(screen.getByText('Count: 0')).toBeTruthy();

      fireEvent.press(screen.getByText('Increment'));

      expect(screen.getByText('Count: 1')).toBeTruthy();
    });
  });
}
