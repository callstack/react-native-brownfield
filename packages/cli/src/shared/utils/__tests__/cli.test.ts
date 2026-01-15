import * as rockTools from '@rock-js/tools';

import { expect, Mock, test, vi } from 'vitest';

import { actionRunner } from '../cli.js';

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

const mockLoggerError = rockTools.logger.error as Mock;

const FAILING_ACTION_ERROR_MESSAGE = 'Test error';

const createWrappedFailingAction = (ErrorCls: new (message: string) => Error) =>
  actionRunner(async (_a: number, _b: number) => {
    throw new ErrorCls(FAILING_ACTION_ERROR_MESSAGE);
  });

test('actionRunner should call the wrapped function', async () => {
  const mockAction = vi.fn(async () => Promise.resolve());
  const wrappedAction = actionRunner(mockAction);

  await wrappedAction();

  expect(mockAction).toHaveBeenCalledOnce();
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
