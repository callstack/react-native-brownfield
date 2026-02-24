import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
import type { MessageEvent } from '@callstack/react-native-brownfield';

type Message = {
  id: string;
  text: string;
  from: 'native' | 'rn';
  timestamp: number;
};

export default function PostMessageScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList<Message>>(null);

  const messageCounterRef = useRef(0);

  useEffect(() => {
    const sub = ReactNativeBrownfield.onMessage((event: MessageEvent) => {
      const data = event.data as { text?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: String(++messageCounterRef.current),
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
      text: `Hello from TesterIntegrated! (#${++messageCounterRef.current})`,
      timestamp: Date.now(),
    };
    ReactNativeBrownfield.postMessage(msg);
    setMessages((prev) => [
      ...prev,
      {
        id: String(messageCounterRef.current),
        text: msg.text,
        from: 'rn',
        timestamp: msg.timestamp,
      },
    ]);
  }, []);

  return (
    <View style={styles.messageSection}>
      <TouchableOpacity
        style={styles.sendButton}
        onPress={sendMessage}
        activeOpacity={0.8}
      >
        <Text style={styles.sendButtonText}>Send message to Native</Text>
      </TouchableOpacity>

      <FlatList
        data={messages}
        keyExtractor={(item) => `message-${item.id}`}
        renderItem={({ item }) => <Text>{item.text}</Text>}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        inverted={true} // ensure newest messages are at the top
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ref={flatListRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  messageSection: {
    flex: 1,
    width: '100%',
    padding: 12,
    paddingHorizontal: 20,
  },
  sendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#4F8EF7',
  },
  sendButtonText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingBottom: 8,
  },
});
