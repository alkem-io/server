import { randomUUID } from 'node:crypto';
import { LogContext } from '@common/enums';
import { GraphQLError } from 'graphql';

/**
 * Email-change-feature error codes (contracts/graphql.md §6). These are stable
 * identifiers in the GraphQL error payload's `extensions.code` field. Kept
 * scoped to this feature rather than expanded into the platform-wide
 * `AlkemioErrorStatus` enum to avoid coupling the error catalogue to a single
 * domain.
 */
export enum UserEmailChangeErrorCode {
  EMAIL_CHANGE_VALIDATION = 'EMAIL_CHANGE_VALIDATION',
  EMAIL_CHANGE_NO_CHANGE = 'EMAIL_CHANGE_NO_CHANGE',
  EMAIL_CHANGE_CONFLICT = 'EMAIL_CHANGE_CONFLICT',
  EMAIL_CHANGE_SUBJECT_NOT_FOUND = 'EMAIL_CHANGE_SUBJECT_NOT_FOUND',
  EMAIL_CHANGE_KRATOS_UNREACHABLE = 'EMAIL_CHANGE_KRATOS_UNREACHABLE',
  EMAIL_CHANGE_KRATOS_WRITE_FAILED = 'EMAIL_CHANGE_KRATOS_WRITE_FAILED',
  EMAIL_CHANGE_ALKEMIO_WRITE_FAILED = 'EMAIL_CHANGE_ALKEMIO_WRITE_FAILED',
  EMAIL_CHANGE_DRIFT_DETECTED = 'EMAIL_CHANGE_DRIFT_DETECTED',
  EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED = 'EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED',
  EMAIL_CHANGE_DRIFT_NOT_FOUND = 'EMAIL_CHANGE_DRIFT_NOT_FOUND',
  EMAIL_CHANGE_UNAUTHORIZED = 'EMAIL_CHANGE_UNAUTHORIZED',
}

const HTTP_STATUS: Record<UserEmailChangeErrorCode, number> = {
  [UserEmailChangeErrorCode.EMAIL_CHANGE_VALIDATION]: 400,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_NO_CHANGE]: 400,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_CONFLICT]: 409,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_SUBJECT_NOT_FOUND]: 404,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_KRATOS_UNREACHABLE]: 502,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_KRATOS_WRITE_FAILED]: 502,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_ALKEMIO_WRITE_FAILED]: 500,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_DETECTED]: 500,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_RESOLUTION_FAILED]: 500,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_DRIFT_NOT_FOUND]: 404,
  [UserEmailChangeErrorCode.EMAIL_CHANGE_UNAUTHORIZED]: 403,
};

/**
 * Feature-scoped GraphQL exception. Mirrors the contract in
 * contracts/graphql.md §6. The `message` MUST NOT carry account-enumeration
 * content (FR-014); structured context goes into `details`.
 */
export class UserEmailChangeException extends GraphQLError {
  public readonly code: UserEmailChangeErrorCode;
  public readonly httpStatus: number;
  public readonly errorId: string;

  constructor(
    code: UserEmailChangeErrorCode,
    message: string,
    public readonly context: LogContext,
    public readonly details?: Record<string, unknown>
  ) {
    const errorId = randomUUID();
    super(message, {
      extensions: {
        code: String(code),
        httpStatus: HTTP_STATUS[code],
        errorId,
        details,
      },
    });
    this.name = 'UserEmailChangeException';
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.errorId = errorId;
  }
}
