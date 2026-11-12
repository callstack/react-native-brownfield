import { Button, StyleSheet, Text } from 'react-native';
import { useStore } from '@callstack/brownie';

import { brownfieldE2ETestIds } from '../e2eTestIds';

type CounterProps = {
  /** Optional host palette. RNApp themes the counter; the Expo demos use the default colors. */
  colors?: { primary: string; secondary: string };
};

/**
 * Brownie shared-store demo: the count lives in the native `BrownfieldStore` and stays in sync
 * with whatever the native host renders.
 */
const Counter = ({ colors }: CounterProps) => {
  const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);

  return (
    <>
      <Text
        testID={brownfieldE2ETestIds.counterCount}
        accessibilityLabel={`Count: ${counter}`}
        style={[styles.text, colors && { color: colors.secondary }]}
      >
        Count: {counter}
      </Text>

      <Button
        testID={brownfieldE2ETestIds.counterIncrement}
        onPress={() => setState((prev) => ({ counter: prev.counter + 1 }))}
        color={colors?.secondary}
        title="Increment"
      />
    </>
  );
};

export default Counter;

const styles = StyleSheet.create({
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
});
