import { StyleSheet, Text } from 'react-native';

type CounterProps = {
  colors: { primary: string; secondary: string };
};

const Counter = ({ colors }: CounterProps) => {
  return (
    <>
      <Text style={[styles.text, { color: colors.secondary }]}>
        Brownie: To be implemented
      </Text>
    </>
  );
};

export default Counter;

const styles = StyleSheet.create({
  text: {
    fontSize: 30,
    fontWeight: 'bold',
    margin: 10,
  },
});
