export type ExceptionDetails = ExceptionExtraDetails & Record<string, unknown>;

export type ExceptionExtraDetails = {
  userId?: string;
  message?: string;
  /**
   * A probable cause added manually by the developer
   */
  cause?: string;
  originalException?: Error | unknown;
};
