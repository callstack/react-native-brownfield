import { StyleSheet, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeScreen } from '@callstack/brownfield-shared/HomeScreen';

import type { RootStackParamList } from './navigation/RootStack';

// type props from Stack.Navigator -> Stack.Screen
export function RNHomeScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <HomeScreen
      name="React Native"
      extraContents={
        <Image
          style={styles.image}
          source={{
            uri: 'https://picsum.photos/800/800',
          }}
        />
      }
      navigation={navigation as any}
      route={route}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
    width: '100%',
    borderRadius: 20,
  },
});
