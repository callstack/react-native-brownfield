import { useEffect } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStore } from '@callstack/brownie';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

import type { RootStackParamList } from './navigation/RootStack';
import { getRandomTheme } from './utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation, route }: Props) {
  const colors = route.params?.theme || getRandomTheme();
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
        React Native Screen
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
});
