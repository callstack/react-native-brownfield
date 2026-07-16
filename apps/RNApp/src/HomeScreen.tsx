import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import { brownfieldE2ETestIds } from '@callstack/brownfield-example-shared-tests/e2eTestIds';
import BrownfieldNavigation from '@callstack/brownfield-navigation';

import { getRandomTheme } from './utils';
import type { RootStackParamList } from './navigation/RootStack';
import Counter from './components/counter';
import { useNativeOsVersionLabel } from './nativeHostContext';

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
      <Text
        testID={
          isFromNative ? undefined : brownfieldE2ETestIds.rnPostMessageText
        }
        style={styles.bubbleText}
      >
        {item.text}
      </Text>
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

  const addMessage = useCallback(
    (text: string, from: Message['from'], id?: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: id ?? String(++messageCounter),
          text,
          from,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  const sendMessage = useCallback(() => {
    const id = String(++messageCounter);
    const msg = {
      text: `Hello from React Native! (#${id})`,
      timestamp: Date.now(),
    };
    ReactNativeBrownfield.postMessage(msg);
    addMessage(msg.text, 'rn', id);
  }, [addMessage]);

  const requestNativeConfirmation = useCallback(async () => {
    try {
      const confirmed = await BrownfieldNavigation.requestNativeConfirmation(
        'Are you sure you want to continue?'
      );
      addMessage(`Native confirmation result: ${confirmed}`, 'native');
    } catch (error) {
      addMessage(`Native confirmation failed: ${error}`, 'native');
    }
  }, [addMessage]);

  const showNativeBanner = useCallback(() => {
    BrownfieldNavigation.showNativeBanner('Hello from React Native!', () => {
      addMessage('Native banner dismissed', 'native');
    });
  }, [addMessage]);

  return (
    <View
      testID={brownfieldE2ETestIds.rnAppHome}
      style={[styles.container, { backgroundColor: colors.primary }]}
    >
      <Text
        testID={brownfieldE2ETestIds.rnAppHomeTitle}
        accessibilityLabel="React Native Screen"
        style={[styles.text, { color: colors.secondary }]}
      >
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

      <View style={styles.nativeNavButtons}>
        <Button
          testID={brownfieldE2ETestIds.openNativeSettings}
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
          testID={brownfieldE2ETestIds.openNativeReferrals}
          onPress={() => BrownfieldNavigation.navigateToReferrals('user-123')}
          color={colors.secondary}
          title="Open native referrals"
        />

        <Button
          onPress={requestNativeConfirmation}
          color={colors.secondary}
          title="Request native confirmation"
        />

        <Button
          onPress={showNativeBanner}
          color={colors.secondary}
          title="Show native banner"
        />
      </View>

      <View style={styles.messageSection}>
        <TouchableOpacity
          testID={brownfieldE2ETestIds.sendMessageToNative}
          style={[styles.sendButton, { backgroundColor: colors.secondary }]}
          onPress={sendMessage}
          activeOpacity={0.8}
        >
          <Text style={[styles.sendButtonText, { color: colors.primary }]}>
            Send message to Native
          </Text>
        </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 48,
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
    minHeight: 0,
    width: '100%',
    marginTop: 12,
  },
  sendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  sendButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  messageList: {
    flex: 1,
    minHeight: 0,
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
  nativeNavButtons: {
    width: '100%',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
