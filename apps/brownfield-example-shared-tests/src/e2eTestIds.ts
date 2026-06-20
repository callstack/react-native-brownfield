/**
 * Stable identifiers for Detox (and optional Maestro) runs across demo apps.
 */
export const brownfieldE2ETestIds = {
  rnAppHome: 'brownfield-e2e-rnapp-home',
  /** Title copy on RNApp home — use for Detox instead of `by.text` (iOS accessibility / Fabric). */
  rnAppHomeTitle: 'brownfield-e2e-rnapp-home-title',
  sendMessageToNative: 'brownfield-e2e-send-message-native',
  openNativeSettings: 'brownfield-e2e-open-native-settings',
  openNativeReferrals: 'brownfield-e2e-open-native-referrals',
  counterCount: 'brownfield-e2e-counter-count',
  counterIncrement: 'brownfield-e2e-counter-increment',
  /** RN-authored postMessage bubble body (may repeat across list — use atIndex(0) for newest). */
  rnPostMessageText: 'brownfield-e2e-rn-post-message-text',
  /** AppleApp native SwiftUI shell (keep in sync with apps/AppleApp/.../E2eTestIds.swift). */
  appleAppGreeting: 'brownfield-e2e-appleapp-greeting',
  appleAppPostMessageSend: 'brownfield-e2e-appleapp-post-message-send',
  appleAppPostMessageToast: 'brownfield-e2e-appleapp-post-message-toast',
  appleAppNativeSettings: 'brownfield-e2e-appleapp-native-settings',
  appleAppNativeReferrals: 'brownfield-e2e-appleapp-native-referrals',
} as const;
