import { useCallback, useSyncExternalStore } from 'react';
import BrownieModule from './NativeBrownieModule';

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
export function subscribe(key: string, listener: StoreListener): () => void {
  const store = getOrCreateStore(key);
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

/**
 * Get current store state snapshot.
 */
export function getSnapshot<T = Record<string, unknown>>(key: string): T {
  const store = getOrCreateStore(key);
  return store.snapshot as T;
}

/**
 * Set a value in the native store.
 */
export function setState<T>(key: string, partial: Partial<T>): void {
  const store = getOrCreateStore(key);
  if (!store.hostObject) return;

  for (const [prop, value] of Object.entries(partial)) {
    store.hostObject[prop] = value;
  }
}

/**
 * React hook for subscribing to a native store.
 * @param key Store key registered in StoreManager
 * @returns Current store state
 */
export function useBrownieStore<T>(key: string): T {
  const sub = useCallback(
    (listener: () => void) => subscribe(key, listener),
    [key]
  );
  const snap = useCallback(() => getSnapshot<T>(key), [key]);
  return useSyncExternalStore(sub, snap, snap);
}
