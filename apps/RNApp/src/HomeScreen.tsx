import { useEffect } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

import { getRandomTheme } from './utils';
import type { RootStackParamList } from './navigation/RootStack';
import Counter from './components/counter';

export function HomeScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const colors = route.params?.theme ? route.params.theme : getRandomTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const isFirstRoute = !navigation.canGoBack();
      ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(isFirstRoute);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={[styles.text, { color: colors.secondary }]}>
        React Native Screen
      </Text>

      <Counter colors={colors} />

      <Button
        onPress={() => {
          navigation.push('Home', {
            theme: getRandomTheme(),
          });
        }}
        color={colors.secondary}
        title="Push next screen"
      />

      <Button
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            ReactNativeBrownfield.popToNative(true);
          }
        }}
        color={colors.secondary}
        title="Go back"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
});
