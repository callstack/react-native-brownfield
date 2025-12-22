import type { BrownieStore } from '@callstack/brownie';

interface BrownfieldStore extends BrownieStore {
  counter: number;
  user: {
    name: string;
    settings: {
      theme: 'light' | 'dark';
    };
  };
  isLoading: boolean;
  hasError: boolean;
}

interface SettingsStore extends BrownieStore {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  privacyMode: boolean;
}

declare module '@callstack/brownie' {
  interface BrownieStores {
    BrownfieldStore: BrownfieldStore;
    SettingsStore: SettingsStore;
  }
}
