import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  navigateToSettings(): void;
  navigateToReferrals(userId: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'NativeBrownfieldNavigation'
);
