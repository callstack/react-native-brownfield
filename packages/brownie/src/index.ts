import { useCallback, useSyncExternalStore } from 'react';
import BrownieModule from './NativeBrownieModule';

/**
 * Empty interface for module augmentation.
 * Users extend this in their *.brownie.ts files.
 */
export interface BrownieStores {}

export interface BrownieStore {}

type StoreListener = () => void;

interface StoreCache {
  hostObject: any;
  snapshot: Record<string, unknown>;
  listeners: Set<StoreListener>;
}

const stores = new Map<string, StoreCache>();

function getHostObject(key: string): any {
  // @ts-ignore
  return global.__getStore?.(key);
}

function getOrCreateStore(key: string): StoreCache {
  let store = stores.get(key);
  if (!store) {
    const hostObject = getHostObject(key);
    store = {
      hostObject,
      snapshot: hostObject?.unbox?.() ?? {},
      listeners: new Set(),
    };
    stores.set(key, store);
  }
  return store;
}

function refreshSnapshot(key: string): void {
  const store = stores.get(key);
  if (store) {
    store.snapshot = store.hostObject?.unbox?.() ?? {};
    store.listeners.forEach((listener) => listener());
  }
}

BrownieModule.nativeStoreDidChange(() => {
  stores.forEach((_, key) => refreshSnapshot(key));
});

/**
 * Subscribe to store changes from native side.
 * @returns Unsubscribe function
 */
export function subscribe<K extends keyof BrownieStores>(
  key: K,
  listener: StoreListener
): () => void {
  const store = getOrCreateStore(key as string);
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

/**
 * Get current store state snapshot.
 */
export function getSnapshot<K extends keyof BrownieStores>(
  key: K
): BrownieStores[K] {
  const store = getOrCreateStore(key as string);
  return store.snapshot as BrownieStores[K];
}

type SetStateAction<T> = Partial<T> | ((prevState: T) => Partial<T>);

/**
 * Set a value in the native store.
 */
export function setState<K extends keyof BrownieStores>(
  key: K,
  action: SetStateAction<BrownieStores[K]>
): void {
  const store = getOrCreateStore(key as string);
  if (!store.hostObject) return;

  const partial =
    typeof action === 'function'
      ? action(store.snapshot as BrownieStores[K])
      : action;

  for (const [prop, value] of Object.entries(partial)) {
    store.hostObject[prop] = value;
  }
}

/**
 * React hook for subscribing to a native store.
 * @param key Store key registered in StoreManager
 * @returns Tuple of [state, setState] for the store
 */
export function useBrownieStore<K extends keyof BrownieStores>(
  key: K
): [BrownieStores[K], (action: SetStateAction<BrownieStores[K]>) => void] {
  const sub = useCallback(
    (listener: () => void) => subscribe(key, listener),
    [key]
  );
  const snap = useCallback(() => getSnapshot(key), [key]);
  const state = useSyncExternalStore(sub, snap, snap);
  const boundSetState = useCallback(
    (action: SetStateAction<BrownieStores[K]>) => setState(key, action),
    [key]
  );
  return [state, boundSetState];
}
