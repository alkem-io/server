import { ErrorCode } from '@alkemio/matrix-adapter-lib';
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

/**
 * Map adapter error codes to Alkemio error status codes.
 */
function mapErrorCodeToAlkemioStatus(code?: ErrorCode): AlkemioErrorStatus {
  if (!code) {
    return AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR;
  }

  // Map specific error codes to appropriate Alkemio statuses
  switch (code) {
    case 'INVALID_PARAM':
      return AlkemioErrorStatus.BAD_USER_INPUT;
    case 'ROOM_NOT_FOUND':
    case 'SPACE_NOT_FOUND':
    case 'ACTOR_NOT_FOUND':
      return AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR;
    case 'NOT_ALLOWED':
      return AlkemioErrorStatus.FORBIDDEN;
    case 'MATRIX_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR;
  }
}
