type UserType = {
  id: string;
  name: string;
  email: string;
};

export interface BrownfieldNavigationSpec {
  /**
   * Navigate to the native settings screen
   */
  navigateToSettings(user: UserType): void;

  /**
   * Navigate to the native referrals screen
   * @param userId - The user's unique identifier
   */
  navigateToReferrals(userId: string): void;
}
