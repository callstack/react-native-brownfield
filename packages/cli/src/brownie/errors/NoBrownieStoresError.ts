export class NoBrownieStoresError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoBrownieStoresError';
  }
}
