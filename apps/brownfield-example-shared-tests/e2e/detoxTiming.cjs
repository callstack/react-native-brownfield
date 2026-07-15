'use strict';

/** Shared Detox timing constants — keep poll intervals and budgets centralized. */
const DETOX_TIMING = {
  /** Poll interval for the visibility of RN surfaces. */
  POLL_INTERVAL_MS: 250,

  /** Timeout for the visibility of RN surfaces. */
  VISIBILITY_TIMEOUT_MS: 30_000,

  /** Timeout for the visibility of post message bubbles. */
  POST_MESSAGE_BUBBLE_TIMEOUT_MS: 15_000,

  /** Timeout for the visibility of toasts. */
  TOAST_VISIBILITY_TIMEOUT_MS: 15_000,

  /** Timeout for the entire E2E test suite (detox + Jest + Maestro). */
  TEST_TIMEOUT_MS: 720_000,
};

module.exports = { DETOX_TIMING };
