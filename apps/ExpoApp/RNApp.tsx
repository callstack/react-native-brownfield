import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@callstack/brownie';

export default function RNApp() {
  const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo React Native Brownfield</Text>

      <View style={styles.content}>
        <Text style={styles.text}>Brownie Store Counter: {counter}</Text>
        <Button
          title="Increment"
          onPress={() => setState((prev) => ({ counter: prev.counter + 1 }))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eeeeee',
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 5,
  },
});
