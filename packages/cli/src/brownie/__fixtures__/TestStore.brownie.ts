type TestStore = {
  counter: number;
  name: string;
  isActive: boolean;
};

declare module '@callstack/brownie' {
  interface BrownieStores {
    TestStore: TestStore;
  }
}
