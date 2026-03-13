import { Animated, StyleSheet } from 'react-native';
import { Message } from './Message';
import { useEffect, useRef } from 'react';
import { ThemedText } from '@/components/themed-text';

export function MessageBubble({ item }: { item: Message }) {
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
          borderColor: isFromNative ? '#4F8EF7' : '#DAA520',
        },
      ]}
    >
      <ThemedText style={styles.bubbleLabel}>
        {isFromNative ? 'From Native' : 'From RN'}
      </ThemedText>
      <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  bubbleNative: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(79, 142, 247, 0.1)',
    maxWidth: '80%',
  },
  bubbleRN: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
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
  },
});
