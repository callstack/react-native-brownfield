import BrownfieldNavigation from '@callstack/brownfield-navigation';
import ReactNativeBrownfield, {
  type MessageEvent,
} from '@callstack/react-native-brownfield';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Counter from './components/Counter';
import { useNativeOsVersionLabel } from './nativeHostContext';
import type { RootStackParamList } from './navigation/RootStack';
import { getRandomTheme } from './utils';

interface Message {
  id: string;
  text: string;
  from: 'native' | 'rn';
  timestamp: number;
}

function MessageBubble({ item, color }: { item: Message; color: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const isFromNative = item.from === 'native';

  return (
    <Animated.View
      style={[
        styles.bubble,
        isFromNative ? styles.bubbleNative : styles.bubbleRN,
        {
          opacity,
          transform: [{ translateY }],
          borderColor: color,
        },
      ]}
    >
      <Text style={[styles.bubbleLabel, { color }]}>
        {isFromNative ? 'From Native' : 'From RN'}
      </Text>
      <Text style={styles.bubbleText}>{item.text}</Text>
    </Animated.View>
  );
}

let messageCounter = 0;

export function HomeScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const nativeOsVersionLabel = useNativeOsVersionLabel();
  const colors = route.params?.theme ? route.params.theme : getRandomTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const isFirstRoute = !navigation.canGoBack();
      ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(isFirstRoute);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const sub = ReactNativeBrownfield.onMessage((event: MessageEvent) => {
      const data = event.data as { text?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: String(++messageCounter),
          text: data?.text ?? JSON.stringify(event.data),
          from: 'native',
          timestamp: Date.now(),
        },
      ]);
    });
    return () => sub.remove();
  }, []);

  const sendMessage = useCallback(() => {
    const msg = {
      text: `Hello from React Native! (#${++messageCounter})`,
      timestamp: Date.now(),
    };
    ReactNativeBrownfield.postMessage(msg);
    setMessages((prev) => [
      ...prev,
      {
        id: String(messageCounter),
        text: msg.text,
        from: 'rn',
        timestamp: msg.timestamp,
      },
    ]);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.primary }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.text, { color: colors.secondary }]}>
        React Native Screen
      </Text>

      {nativeOsVersionLabel ? (
        <Text
          style={[styles.nativeOsVersionLabel, { color: colors.secondary }]}
          accessibilityLabel="Native OS version"
        >
          {nativeOsVersionLabel}
        </Text>
      ) : null}

      <Counter colors={colors} />

      <View style={styles.messageSection}>
        <Button
          onPress={sendMessage}
          color={colors.secondary}
          title="Send message to Native"
        />

        <FlatList
          data={messages}
          keyExtractor={(item) => `message-${item.id}`}
          renderItem={({ item }) => (
            <MessageBubble item={item} color={colors.secondary} />
          )}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          inverted={true} // ensure newest messages are at the top
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          ref={flatListRef}
        />
      </View>

      <View style={styles.navButtons}>
        <Button
          onPress={() => {
            navigation.push('Home', { theme: getRandomTheme() });
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
      <View style={styles.settingsButtons}>
        <Button
          onPress={() =>
            BrownfieldNavigation.navigateToSettings({
              id: '123',
              name: 'John Doe',
              email: 'john.doe@example.com',
              flags: ['admin', 'user'],
              ids: ['123', '456'],
              avatar: {
                url: 'https://example.com/avatar.png',
              },
            })
          }
          color={colors.secondary}
          title="Open native settings"
        />

        <Button
          onPress={() => BrownfieldNavigation.navigateToReferrals('user-123')}
          color={colors.secondary}
          title="Open native referrals"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 48,
    alignContent: 'center',
  },
  text: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nativeOsVersionLabel: {
    fontSize: 11,
    opacity: 0.85,
    marginBottom: 4,
    textAlign: 'center',
  },
  messageSection: {
    flex: 1,
    width: '100%',
    marginTop: 12,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingBottom: 8,
  },
  bubble: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  bubbleNative: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    maxWidth: '80%',
  },
  bubbleRN: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.1)',
    maxWidth: '80%',
  },
  bubbleLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 14,
    color: '#fff',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  settingsButtons: {
    gap: 8,
    marginTop: 8,
  },
});
