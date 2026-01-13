type TestStore = {
  counter: number;
  name: string;
  isActive: boolean;
};

// @ts-expect-error: inexistent module augmentation
declare module '@callstack/brownie' {
  interface BrownieStores {
    TestStore: TestStore;
  }
}
