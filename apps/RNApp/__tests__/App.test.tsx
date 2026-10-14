/**
 * @format
 */

import ReactTestRenderer from 'react-test-renderer';
import { App } from '@callstack/brownfield-example-shared';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
