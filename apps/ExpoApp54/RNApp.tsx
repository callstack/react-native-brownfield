import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StyleSheet, Text, View } from 'react-native';
import BrownfieldNavigation from '@callstack/brownfield-navigation';

import Counter from './components/counter';

type RNAppProps = {
  nativeOsVersionLabel?: string;
};

export default function RNApp({ nativeOsVersionLabel }: RNAppProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo React Native Brownfield</Text>

      {nativeOsVersionLabel ? (
        <Text
          style={styles.nativeOsVersionLabel}
          accessibilityLabel="Native OS version"
        >
          {nativeOsVersionLabel}
        </Text>
      ) : null}

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
  nativeOsVersionLabel: {
    fontSize: 11,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 4,
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
