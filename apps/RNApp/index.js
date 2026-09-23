/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { View, Text, Button } from 'react-native';
import ReactNativeBrownfield from '@callstack/react-native-brownfield';

AppRegistry.registerComponent(appName, () => App);

function RNB() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>RNB</Text>
      <Button
        title="Go to Home"
        onPress={() => ReactNativeBrownfield.popToNative(true)}
      />
    </View>
  );
}

AppRegistry.registerComponent('RNB', () => RNB);
