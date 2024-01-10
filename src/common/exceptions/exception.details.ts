export type ExceptionDetails = ExceptionExtraDetails & Record<string, unknown>;

export type ExceptionExtraDetails = {
  userId?: string;
  message?: string;
  originalException?: Error;
};
