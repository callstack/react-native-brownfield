import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Alert, Button, StyleSheet, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Updates from 'expo-updates';

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
    console.log('== updates diagnostics error', error);
  }
}

async function checkForUpdate() {
  try {
    console.log('== checkForUpdateAsync start');
    // const update = await withTimeout(
    //   Updates.checkForUpdateAsync(),
    //   15000,
    //   'checkForUpdateAsync'
    // );
    const update = await Updates.checkForUpdateAsync();

    console.log('== checkForUpdateAsync isAvailable -- ', update.isAvailable);
    console.log(
      '== checkForUpdateAsync isRollBackToEmbedded -- ',
      update.isRollBackToEmbedded
    );
    console.log('== checkForUpdateAsync ID -- ', update.manifest?.id);
    console.log(
      '== checkForUpdateAsync assets -- ',
      update.manifest?.assets.length
    );
    if (update.isAvailable) {
      const fetchUpdateResult = await Updates.fetchUpdateAsync();
      console.log(
        '== fetchUpdateAsync result ',
        fetchUpdateResult.isNew,
        fetchUpdateResult.manifest?.id,
        fetchUpdateResult.isRollBackToEmbedded,
        fetchUpdateResult.manifest?.assets.length
      );

      await Updates.reloadAsync({
        reloadScreenOptions: {
          spinner: {
            enabled: true,
            color: 'red',
            size: 'large',
          },
        },
      });

      // console.log('== update applied', update);
      // Alert.alert(
      //   'Update available',
      //   'Please restart the app to apply the update'
      // );
    } else {
      Alert.alert('No update available');
    }
  } catch (error) {
    console.log('== checkForUpdateAsync/fetchUpdateAsync failed', error);
    Alert.alert('Update check failed', String(error));
  }
}

async function readLogs() {
  try {
    const logs = await Updates.readLogEntriesAsync();
    console.log('== readLogs result', logs);
  } catch (error) {
    console.log('== readLogs error', error);
  }
}

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.reactLogo}
          />
        }
      >
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Welcome to Expo 54! - BACK</ThemedText>
          <HelloWave />
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
          <Button
            title="Fetch Update - Now"
            onPress={() => {
              // readLogs();
              // logUpdatesDiagnostics();
              checkForUpdate();
              // BrownfieldNavigation.navigateToSettings()
            }}
          />
          {/* <ThemedText type="subtitle">Step 1: Try it</ThemedText>
          <ThemedText>
            Edit{' '}
            <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText>{' '}
            to see changes. Press{' '}
            <ThemedText type="defaultSemiBold">
              {Platform.select({
                ios: 'cmd + d',
                android: 'cmd + m',
                web: 'F12',
              })}
            </ThemedText>{' '}
            to open developer tools.
          </ThemedText> */}
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
          <Link href="/modal">
            <Link.Trigger>
              <ThemedText type="subtitle">Step 2: Explore</ThemedText>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              <Link.MenuAction
                title="Action"
                icon="cube"
                onPress={() => alert('Action pressed')}
              />
              <Link.MenuAction
                title="Share"
                icon="square.and.arrow.up"
                onPress={() => alert('Share pressed')}
              />
              <Link.Menu title="More" icon="ellipsis">
                <Link.MenuAction
                  title="Delete"
                  icon="trash"
                  destructive
                  onPress={() => alert('Delete pressed')}
                />
              </Link.Menu>
            </Link.Menu>
          </Link>
        </ThemedView>
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
          <ThemedText>
            {`When you're ready, run `}
            <ThemedText type="defaultSemiBold">
              npm run reset-project
            </ThemedText>{' '}
            to get a fresh <ThemedText type="defaultSemiBold">app</ThemedText>{' '}
            directory. This will move the current{' '}
            <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
            <ThemedText type="defaultSemiBold">app-example</ThemedText>.
          </ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
