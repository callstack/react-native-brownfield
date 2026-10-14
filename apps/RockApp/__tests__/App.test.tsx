/**
 * @format
 */

import 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { it } from '@jest/globals';
import App from '../App';

it('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
