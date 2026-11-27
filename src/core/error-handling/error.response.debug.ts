/**
 * Debug detail in error responses (stack traces, full details, the original
 * message) is on only when ERROR_RESPONSE_DEBUG is exactly `true`. Read on
 * every call so a test or an operator can flip it without a restart.
 */
export const isErrorResponseDebugEnabled = (): boolean =>
  process.env.ERROR_RESPONSE_DEBUG === 'true';
