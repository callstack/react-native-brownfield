import { Platform } from 'react-native';
import ReactNativeBrownfieldModule from './NativeReactNativeBrownfieldModule';

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

ReactNativeBrownfieldModule.nativeStoreDidChange(() => {
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

const ReactNativeBrownfield = {
  popToNative: (animated?: boolean): void => {
    if (Platform.OS === 'ios') {
      ReactNativeBrownfieldModule.popToNative(!!animated);
    } else if (Platform.OS === 'android') {
      ReactNativeBrownfieldModule.popToNative(false);
    } else {
      console.warn('Not implemented: popToNative');
    }
  },

  setNativeBackGestureAndButtonEnabled: (enabled: boolean): void => {
    if (Platform.OS === 'ios') {
      ReactNativeBrownfieldModule.setPopGestureRecognizerEnabled(enabled);
    } else if (Platform.OS === 'android') {
      ReactNativeBrownfieldModule.setHardwareBackButtonEnabled(enabled);
    } else {
      console.warn('Not implemented: setNativeGesturesAndButtonsEnabled');
    }
  },

  subscribe,
  getSnapshot,
  setState,
};

export default ReactNativeBrownfield;
