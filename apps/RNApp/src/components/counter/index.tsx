import { brownfieldE2eTestIds } from '@callstack/brownfield-example-shared-tests/e2eTestIds';
import { Button, StyleSheet, Text } from 'react-native';
import { useStore } from '@callstack/brownie';

type CounterProps = {
  colors: { primary: string; secondary: string };
};

const Counter = ({ colors }: CounterProps) => {
  const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);

  return (
    <>
      <Text
        testID={brownfieldE2eTestIds.counterCount}
        accessibilityLabel={`Count: ${counter}`}
        style={[styles.text, { color: colors.secondary }]}
      >
        Count: {counter}
      </Text>

      <Button
        testID={brownfieldE2eTestIds.counterIncrement}
        onPress={() => setState((prev) => ({ counter: prev.counter + 1 }))}
        color={colors.secondary}
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
