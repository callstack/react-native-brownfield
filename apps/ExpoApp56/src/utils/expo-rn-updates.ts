import { userAlert } from '@callstack/brownfield-example-shared-tests/runtime';
import * as Updates from 'expo-updates';

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
      userAlert('No update available');
    }
  } catch (error) {
    userAlert('Update check failed', String(error));
  }
}
