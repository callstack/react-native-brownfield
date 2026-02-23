import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import Counter from './components/counter';

export default function RNApp() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo React Native Brownfield</Text>

      <View style={styles.content}>
        <Counter />
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
