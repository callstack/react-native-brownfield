import { useEffect } from 'react';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

/**
 * Demo only: stands in for the data this screen would load before it is useful.
 * Real apps call `markFullyDisplayed` once that data has rendered, not after a fixed delay.
 */
const DEMO_FULL_DISPLAY_DELAY_MS = 500;

/** Marks the native presentation as fully displayed (TTFD) after the demo delay. */
export function useMarkFullyDisplayed(brownfieldPresentationID?: string) {
  useEffect(() => {
    if (!brownfieldPresentationID) {
      return;
    }
    const timeout = setTimeout(
      () => ReactNativeBrownfield.markFullyDisplayed(brownfieldPresentationID),
      DEMO_FULL_DISPLAY_DELAY_MS
    );
    return () => clearTimeout(timeout);
  }, [brownfieldPresentationID]);
}
