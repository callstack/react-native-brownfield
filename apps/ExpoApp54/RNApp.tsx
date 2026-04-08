import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import BrownfieldNavigation from '@callstack/brownfield-navigation';
import * as Updates from 'expo-updates';

import Counter from './components/counter';

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function logUpdatesDiagnostics() {
  try {
    const extra = await Updates.getExtraParamsAsync();
    console.log('== updates diagnostics', {
      isEnabled: Updates.isEnabled,
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      updateId: Updates.updateId,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      emergencyLaunchReason: Updates.emergencyLaunchReason ?? null,
      launchDuration: Updates.launchDuration ?? null,
      manifestKeys: Object.keys(Updates.manifest ?? {}),
      extraParams: extra,
    });
  } catch (error) {
    console.error('== updates diagnostics error', error);
  }
}

async function checkForUpdate() {
  try {
    console.log('== checkForUpdateAsync start');
    const update = await withTimeout(
      Updates.checkForUpdateAsync(),
      15000,
      'checkForUpdateAsync'
    );

    console.log('== checkForUpdateAsync result', update);
    if (update.isAvailable) {
      const fetchResult = await Updates.fetchUpdateAsync();
      console.log('== fetchUpdateAsync result', fetchResult);
      await Updates.reloadAsync();

      console.log('== update applied', update);
      Alert.alert(
        'Update available',
        'Please restart the app to apply the update'
      );
    } else {
      Alert.alert('No update available');
    }
  } catch (error) {
    console.error('== checkForUpdateAsync/fetchUpdateAsync failed', error);
    Alert.alert('Update check failed', String(error));
  }
}

export default function RNApp() {
  // useEffect(() => {
  //   logUpdatesDiagnostics();
  //   checkForUpdate();
  // }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>123123 Expo React Native Brownfield</Text>

      <View style={styles.content}>
        <Counter />

        <Button
          title="Navigate to Testing ===="
          onPress={() => {
            logUpdatesDiagnostics();
            checkForUpdate();
            // BrownfieldNavigation.navigateToSettings()
          }}
        />
        <Button
          title="Navigate to Referrals"
          onPress={() => BrownfieldNavigation.navigateToReferrals('123')}
        />
        <Button
          title="Probe Updates Endpoint"
          onPress={() => {
            probeUpdatesEndpoint();
          }}
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
