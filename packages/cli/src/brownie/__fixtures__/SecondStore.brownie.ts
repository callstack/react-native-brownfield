type SecondStore = {
  theme: string;
  enabled: boolean;
};

// @ts-expect-error: inexistent module augmentation
declare module '@callstack/brownie' {
  interface BrownieStores {
    SecondStore: SecondStore;
  }
}
