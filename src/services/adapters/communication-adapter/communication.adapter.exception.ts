import {
  ErrCodeActorNotFound,
  ErrCodeDeadlineExceeded,
  ErrCodeInvalidParam,
  ErrCodeMessageNotFound,
  ErrCodeNotAllowed,
  ErrCodeReactionNotFound,
  ErrCodeRequestExpired,
  ErrCodeRoomNotFound,
  ErrCodeSpaceNotFound,
  ErrorCode,
} from '@alkemio/matrix-adapter-lib';
import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { ExceptionDetails } from '@common/exceptions/exception.details';
import { AdapterErrorInfo } from './communication.adapter.response';

/**
 * Exception thrown when a communication adapter operation fails.
 * Includes structured error information from the adapter response.
 */
export class CommunicationAdapterException extends BaseException {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly adapterError?: AdapterErrorInfo,
    details?: ExceptionDetails
  ) {
    super(
      message,
      LogContext.COMMUNICATION,
      mapErrorCodeToAlkemioStatus(adapterError?.code),
      {
        ...details,
        operation,
        adapterErrorCode: adapterError?.code,
        adapterErrorMessage: adapterError?.message,
        adapterErrorDetails: adapterError?.details,
      }
    );
  }

  /**
   * Create exception from adapter error info.
   */
  static fromAdapterError(
    operation: string,
    error: AdapterErrorInfo,
    contextDetails?: Record<string, unknown>
  ): CommunicationAdapterException {
    const message = `Communication adapter ${operation} failed: ${error.message}`;
    return new CommunicationAdapterException(
      message,
      operation,
      error,
      contextDetails
    );
  }

  /**
   * Create exception for transport/network errors (when we don't get a structured response).
   */
  static fromTransportError(
    operation: string,
    error: unknown,
    contextDetails?: Record<string, unknown>
  ): CommunicationAdapterException {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new CommunicationAdapterException(
      `Communication adapter ${operation} failed: transport error`,
      operation,
      undefined,
      {
        ...contextDetails,
        originalException: error,
        cause: errorMessage,
      }
    );
  }
}

const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  ErrCodeRoomNotFound,
  ErrCodeSpaceNotFound,
  ErrCodeActorNotFound,
  ErrCodeMessageNotFound,
  ErrCodeReactionNotFound,
]);

const TIMEOUT_CODES: ReadonlySet<string> = new Set([
  ErrCodeDeadlineExceeded,
  ErrCodeRequestExpired,
]);

const TIMEOUT_MESSAGE = /timed?\s?out|timeout|deadline/i;

/**
 * Map adapter error codes to Alkemio error status codes.
 *
 * The adapter being unreachable, slow or broken is an infrastructure
 * condition, so everything that is not an explicit business answer
 * (not found / not allowed / invalid input) maps to
 * COMMUNICATION_ADAPTER_UNAVAILABLE — never to a status whose user message
 * reads as an authorization denial.
 */
export function mapErrorCodeToAlkemioStatus(
  code?: ErrorCode
): AlkemioErrorStatus {
  if (!code) {
    return AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE;
  }
  if (code === ErrCodeInvalidParam) {
    return AlkemioErrorStatus.BAD_USER_INPUT;
  }
  if (NOT_FOUND_CODES.has(code)) {
    return AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR;
  }
  if (code === ErrCodeNotAllowed) {
    return AlkemioErrorStatus.FORBIDDEN;
  }
  // MATRIX_ERROR, INTERNAL_ERROR, DEADLINE_EXCEEDED, REQUEST_EXPIRED and any
  // code this server does not know are adapter-side failures.
  return AlkemioErrorStatus.COMMUNICATION_ADAPTER_UNAVAILABLE;
}

/**
 * Coarse class of a failure raised by an adapter call, for callers that
 * record an outcome (room readiness) rather than surface an error.
 */
export type AdapterErrorClass =
  | 'TIMEOUT'
  | 'TRANSPORT'
  | 'NOT_FOUND'
  | 'NOT_ALLOWED'
  | 'INVALID_PARAM'
  | 'REJECTED'
  | 'UNKNOWN';

export function classifyAdapterError(error: unknown): AdapterErrorClass {
  if (error instanceof CommunicationAdapterException) {
    const code = error.adapterError?.code;
    if (!code) {
      const cause = String(error.details?.cause ?? '');
      return TIMEOUT_MESSAGE.test(cause) ? 'TIMEOUT' : 'TRANSPORT';
    }
    if (TIMEOUT_CODES.has(code)) return 'TIMEOUT';
    if (NOT_FOUND_CODES.has(code)) return 'NOT_FOUND';
    if (code === ErrCodeNotAllowed) return 'NOT_ALLOWED';
    if (code === ErrCodeInvalidParam) return 'INVALID_PARAM';
    // MATRIX_ERROR, INTERNAL_ERROR and anything unknown: the adapter answered
    // and refused or failed the operation.
    return 'REJECTED';
  }
  if (error instanceof Error && TIMEOUT_MESSAGE.test(error.message)) {
    return 'TIMEOUT';
  }
  return 'UNKNOWN';
}

/** True when the failure means the room does not exist on the backend. */
export const isRoomNotFoundError = (error: unknown): boolean =>
  error instanceof CommunicationAdapterException &&
  error.adapterError?.code === ErrCodeRoomNotFound;
