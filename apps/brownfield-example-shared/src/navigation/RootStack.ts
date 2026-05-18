import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { Theme } from '../utils';

export type RootStackParamList = {
  Home: { theme: Theme };
};

export const Stack = createNativeStackNavigator<RootStackParamList>();
