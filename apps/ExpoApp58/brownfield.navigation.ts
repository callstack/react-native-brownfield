type UserType = {
  id: string;
  name: string;
  email?: string;
  flags: string[];
  ids: string[] | null;
  avatar?: AvatarType;
};

type AvatarType = {
  url: string;
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

  /**
   * Ask the native host to confirm an action. Resolves with the user's choice.
   */
  requestNativeConfirmation(title: string): Promise<boolean>;

  /**
   * Show a native banner. The native host calls onDismiss when the banner is dismissed.
   */
  showNativeBanner(message: string, onDismiss: () => void): void;
}
