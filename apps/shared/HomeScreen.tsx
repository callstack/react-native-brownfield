import './BrownfieldStore.brownie';

import { useEffect } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { useStore } from '@callstack/brownie';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

import { getRandomTheme } from './utils';

export function HomeScreen({
  name,
  navigation,
  route,
  extraContents,
}: {
  name: string;
  navigation: {
    addListener: (event: string, listener: () => void) => void;
    canGoBack: () => boolean;
    goBack: () => void;
    push: (route: string, params: Record<string, any>) => void;
  };
  route: {
    params: {
      theme: {
        primary: string;
        secondary: string;
      };
    };
  };
  extraContents: React.ReactNode;
}) {
  const colors = route.params?.theme
    ? // vanilla setup using react-navigation gives an object, expo-router gives a serialized representation
      typeof route.params.theme === 'string'
      ? JSON.parse(route.params.theme)
      : route.params.theme
    : getRandomTheme();
  const [counter, setState] = useStore('BrownfieldStore', (s) => s.counter);

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
        {name} Screen
      </Text>

      <Text style={[styles.text, { color: colors.secondary }]}>
        Count: {counter}
      </Text>

      <Button
        onPress={() => setState((prev) => ({ counter: prev.counter + 1 }))}
        color={colors.secondary}
        title="Increment"
      />

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

      <View style={styles.extraContentsContainer}>{extraContents}</View>
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
  extraContentsContainer: {
    marginTop: 20,
    flex: 1,
    width: '100%',
  },
});
