import { StyleSheet, Text, View, Button, TextInput } from 'react-native';
import { useBrownieStore, setState } from '@callstack/brownie';
import './BrownfieldStore.brownie';

function HomeScreen() {
  const state = useBrownieStore('SettingsStore');

  const handleIncrement = () => {
    setState('BrownfieldStore', { counter: state.counter + 1 });
  };

  const handleSetHasError = () => {
    setState('BrownfieldStore', { hasError: !state.hasError });
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
        onChangeText={(text) => setState('BrownfieldStore', { user: text })}
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
