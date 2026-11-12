import { runUserAlertSuite } from '@callstack/shared-tests';
import { render } from '@testing-library/react-native';
import LottieView from 'lottie-react-native';
import PostMessageTab from '../src/app/postMessage';
import Counter from '@callstack/shared-runtime/counter';
import RNApp from '../RNApp';
import Index from '../src/app';
import {
  runPostMessageTabSuite,
  runCounterSuite,
  runExpoRnAppSuite,
} from '@callstack/shared-tests';

jest.mock('@callstack/shared-runtime/expo/app/home', () => () => null);

runPostMessageTabSuite('ExpoApp57', PostMessageTab);
runCounterSuite('ExpoApp57', Counter);
runExpoRnAppSuite('ExpoApp57', RNApp, 57);

runUserAlertSuite('ExpoApp57');

test('keeps Lottie in the Expo 57 native dependency graph', () => {
  const screen = render(<Index />);

  expect(screen.UNSAFE_getByType(LottieView)).toBeTruthy();
});
