import NativeBrownfieldNavigation from './NativeBrownfieldNavigation';
import type { UserType } from './NativeBrownfieldNavigation';

const BrownfieldNavigation = {
  navigateToSettings: (user: UserType) => {
    NativeBrownfieldNavigation.navigateToSettings(user);
  },
  navigateToReferrals: (userId: string) => {
    NativeBrownfieldNavigation.navigateToReferrals(userId);
  },
};

export default BrownfieldNavigation;
