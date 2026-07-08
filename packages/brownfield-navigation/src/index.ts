import NativeBrownfieldNavigation from './NativeBrownfieldNavigation';
import type { UserType } from './NativeBrownfieldNavigation';

const BrownfieldNavigation = {
  navigateToSettings: (user: UserType) => {
    NativeBrownfieldNavigation.navigateToSettings(user);
  },
  navigateToReferrals: (userId: string) => {
    NativeBrownfieldNavigation.navigateToReferrals(userId);
  },
  requestNativeConfirmation: async (title: string): Promise<boolean> => {
    return NativeBrownfieldNavigation.requestNativeConfirmation(title);
  },
  showNativeBanner: (message: string, onDismiss: () => void) => {
    NativeBrownfieldNavigation.showNativeBanner(message, onDismiss);
  },
};

export default BrownfieldNavigation;
