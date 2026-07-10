import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export async function checkAndFetchUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();

      await Updates.reloadAsync({
        reloadScreenOptions: {
          spinner: {
            enabled: true,
            color: 'red',
            size: 'large',
          },
        },
      });
    } else {
      Alert.alert('No update available');
    }
  } catch (error) {
    Alert.alert('Update check failed', String(error));
  }
}
