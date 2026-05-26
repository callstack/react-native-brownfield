import * as rockTools from '@rock-js/tools';
import * as configModule from '../../../config.js';

import { beforeEach, expect, Mock, test, vi } from 'vitest';

import { actionRunner } from '../cli.js';

vi.mock('../../../config.js', () => ({
  addBrownfieldConfig: vi.fn(),
}));

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual = await importOriginal<typeof rockTools>();
  return {
    ...actual,
    logger: {
      ...actual.logger,
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    },
  };
});

// @ts-expect-error - override typings
const processExitMock = vi.spyOn(process, 'exit').mockImplementation(() => {
  // no-op
});

const mockAddBrownfieldConfig = configModule.addBrownfieldConfig as Mock;
const mockLoggerError = rockTools.logger.error as Mock;

const FAILING_ACTION_ERROR_MESSAGE = 'Test error';

const createWrappedFailingAction = (ErrorCls: new (message: string) => Error) =>
  actionRunner(async (_a: number, _b: number) => {
    throw new ErrorCls(FAILING_ACTION_ERROR_MESSAGE);
  });

beforeEach(() => {
  vi.clearAllMocks();
});

test('actionRunner should call the wrapped function', async () => {
  const mockAction = vi.fn(async () => Promise.resolve());
  const wrappedAction = actionRunner(mockAction);

  await wrappedAction();

  expect(mockAction).toHaveBeenCalledOnce();
});

test('actionRunner should call addBrownfieldConfig with wrapped args', async () => {
  const mockAction = vi.fn(async (_a: number, _b: number) => Promise.resolve());
  const wrappedAction = actionRunner(mockAction);

  await wrappedAction(1, 2);

  expect(mockAddBrownfieldConfig).toHaveBeenCalledExactlyOnceWith(1, 2);
});

test('actionRunner should gracefully handle Errors', async () => {
  const wrappedActionExpectation = expect(
    createWrappedFailingAction(Error)(1, 2)
  );

  await wrappedActionExpectation.resolves.not.toThrowError();
  expect(processExitMock).toHaveBeenCalledExactlyOnceWith(1);
  expect(mockLoggerError).toHaveBeenCalled();
});

test('actionRunner should gracefully handle RockErrors', async () => {
  const wrappedActionExpectation = expect(
    createWrappedFailingAction(rockTools.RockError)(1, 2)
  );

  await wrappedActionExpectation.resolves.not.toThrowError();
  expect(processExitMock).toHaveBeenCalledExactlyOnceWith(1);
  expect(mockLoggerError).toHaveBeenCalled();
});
