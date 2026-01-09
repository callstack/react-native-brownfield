type SecondStore = {
  theme: string;
  enabled: boolean;
};

declare module '@callstack/brownie' {
  interface BrownieStores {
    SecondStore: SecondStore;
  }
}
