import { TurboModuleRegistry, type TurboModule } from 'react-native';

export type UserType = {
  id: string;
  name: string;
  email?: string;
  flags: string[];
  ids: string[] | null;
  avatar?: AvatarType;
};

export type AvatarType = {
  url: string;
};

export interface Spec extends TurboModule {
  navigateToSettings(user: Object): void;
  navigateToReferrals(userId: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeBrownfieldNavigation'
);
