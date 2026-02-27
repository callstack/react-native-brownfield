import { StyleSheet, Text, Button } from 'react-native';
import { useStore } from '@callstack/brownie';

const Counter = () => {
  const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);

  return (
    <>
      <Text style={styles.text}>Count: {counter}</Text>

      <Button
        onPress={() => setState((prev) => ({ counter: prev.counter + 1 }))}
        title="Increment"
      />
    </>
  );
};

export default Counter;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
});
