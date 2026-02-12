import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { HomeScreen } from '@callstack/brownfield-shared/HomeScreen';

import { Image } from 'expo-image';

export default function Home() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  return (
    <HomeScreen
      name="Expo"
      extraContents={
        <Image
          style={styles.image}
          source="https://picsum.photos/800/800"
          contentFit="cover"
          transition={1000}
        />
      }
      navigation={{
        ...(navigation as any),
        push: (route, routeParams) => {
          // @ts-expect-error
          navigation.navigate(route, {
            theme: JSON.stringify(routeParams.theme),
          });
        },
      }}
      route={{
        params: params as any,
      }}
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
