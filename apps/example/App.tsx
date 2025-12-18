import { StyleSheet, Text, View, Button, TextInput } from 'react-native';
import { useBrownieStore, setState } from '@callstack/brownie';
import type { BrownfieldStore } from './brownfield-store.schema';

const STORE_KEY = 'BrownfieldStore';

function HomeScreen() {
  const state = useBrownieStore<BrownfieldStore>(STORE_KEY);

  const handleIncrement = () => {
    setState<BrownfieldStore>(STORE_KEY, { counter: state.counter + 1 });
  };

  const handleSetHasError = () => {
    setState<BrownfieldStore>(STORE_KEY, { hasError: !state.hasError });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native Side</Text>
      <Text style={styles.text}>Count: {state.counter}</Text>
      <Text style={styles.text}>
        Has error: {state.hasError ? 'true' : 'false'}
      </Text>

      <TextInput
        style={styles.input}
        value={state.user}
        onChangeText={(text) =>
          setState<BrownfieldStore>(STORE_KEY, { user: text })
        }
        placeholder="User name"
      />

      <Button onPress={handleIncrement} title="Increment" />
      <Button onPress={handleSetHasError} title="Toggle Has Error" />
    </View>
  );
}
export default function App() {
  return <HomeScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    margin: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: 200,
    marginVertical: 10,
    backgroundColor: '#fff',
  },
});
