import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { Theme } from '../utils';

export type RootStackParamList = {
  Home: {
    theme: Theme;
    brownfieldPresentationID?: string;
  };
};

export const Stack = createNativeStackNavigator<RootStackParamList>();
