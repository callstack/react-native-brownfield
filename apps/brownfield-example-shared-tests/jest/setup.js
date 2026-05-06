/**
 * Shared Jest setup for brownfield example apps. Include via setupFilesAfterEnv.
 *
 * @see https://jestjs.io/docs/configuration#setupfilesafterenv-array
 */

global.__brownieExampleCounter = 0;
global.__resetBrownieExampleStore = () => {
  global.__brownieExampleCounter = 0;
};

jest.mock('@callstack/react-native-brownfield', () => ({
  __esModule: true,
  default: {
    onMessage: jest.fn(() => ({ remove: jest.fn() })),
    postMessage: jest.fn(),
    setNativeBackGestureAndButtonEnabled: jest.fn(),
    popToNative: jest.fn(),
  },
}));

jest.mock('@callstack/brownfield-navigation', () => ({
  __esModule: true,
  default: {
    navigateToSettings: jest.fn(),
    navigateToReferrals: jest.fn(),
  },
}));

jest.mock('@callstack/brownie', () => ({
  __esModule: true,
  /** Resolve React from the app running Jest (cwd), not from this package's nested deps. */
  useStore(key, selector) {
    const React = require(require.resolve('react', { paths: [process.cwd()] }));
    const [, setRev] = React.useState(0);
    const setState = React.useCallback(
      (action) => {
        const prev = { counter: global.__brownieExampleCounter };
        const partial = typeof action === 'function' ? action(prev) : action;
        if (
          partial &&
          typeof partial === 'object' &&
          partial.counter !== undefined
        ) {
          global.__brownieExampleCounter = partial.counter;
        }
        setRev((r) => r + 1);
      },
      [selector]
    );
    return [
      selector({ counter: global.__brownieExampleCounter }),
      setState,
    ];
  },
}));
