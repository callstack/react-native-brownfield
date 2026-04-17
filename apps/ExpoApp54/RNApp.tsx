import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StyleSheet, Text, View } from 'react-native';
import BrownfieldNavigation from '@callstack/brownfield-navigation';

import Counter from './components/counter';

import { checkAndFetchUpdate } from './utils/expo-rn-updates';

export default function RNApp() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo React Native Brownfield</Text>

      <View style={styles.content}>
        <Counter />

        <Button
          title="Navigate to Settings"
          onPress={() => BrownfieldNavigation.navigateToSettings()}
        />
        <Button
          title="Navigate to Referrals"
          onPress={() => BrownfieldNavigation.navigateToReferrals('123')}
        />
        <Button title="Fetch Update" onPress={checkAndFetchUpdate} />
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
