export interface BrownfieldNavigationSpec {
  /**
   * Navigate to the native settings screen
   */
  navigateToSettings(): void;

  /**
   * Navigate to the native referrals screen
   * @param userId - The user's unique identifier
   */
  navigateToReferrals(userId: string): void;
}
