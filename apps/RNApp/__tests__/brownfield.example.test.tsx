import { runUserAlertSuite } from '@callstack/shared-tests';
import { runCounterSuite, runHomeScreenSuite } from '@callstack/shared-tests';
import { HomeScreen } from '../src/HomeScreen';
import Counter from '@callstack/shared-runtime/counter';
import { getRandomTheme } from '../src/utils';

const theme = getRandomTheme();

runHomeScreenSuite('RNApp', HomeScreen);
runCounterSuite('RNApp', Counter, { colors: theme });

runUserAlertSuite('RNApp');
