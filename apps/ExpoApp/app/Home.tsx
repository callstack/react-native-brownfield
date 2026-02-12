import { useLocalSearchParams, useNavigation } from 'expo-router';

import { HomeScreen } from '@callstack/brownfield-shared/HomeScreen';

export default function Home() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  return (
    <HomeScreen
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
