import NativeBrownfieldNavigation from './NativeBrownfieldNavigation';

const BrownfieldNavigation = {
  navigateToSettings: () => {
    NativeBrownfieldNavigation.navigateToSettings();
  },
  navigateToReferrals: (userId: string) => {
    NativeBrownfieldNavigation.navigateToReferrals(userId);
  },
};

export default BrownfieldNavigation;
