import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: {
    theme: { primary: string; secondary: string };
    brownfieldPresentationID?: string;
  };
};

export const Stack = createNativeStackNavigator<RootStackParamList>();
