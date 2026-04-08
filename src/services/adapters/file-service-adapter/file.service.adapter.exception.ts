import { LogContext } from '@common/enums';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { BaseException } from '@common/exceptions/base.exception';
import { ExceptionDetails } from '@common/exceptions/exception.details';

/**
 * Exception thrown when the Go file-service-go is unavailable or its circuit breaker is open.
 */
export class StorageServiceUnavailableException extends BaseException {
  constructor(message: string, details?: ExceptionDetails) {
    super(
      message,
      LogContext.STORAGE_BUCKET,
      AlkemioErrorStatus.STORAGE_SERVICE_UNAVAILABLE,
      details
    );
  }
}

/**
 * Exception thrown when a file service adapter operation fails.
 */
export class FileServiceAdapterException extends BaseException {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly httpStatus?: number,
    details?: ExceptionDetails
  ) {
    super(
      message,
      LogContext.STORAGE_BUCKET,
      mapHttpStatusToAlkemioStatus(httpStatus),
      {
        ...details,
        operation,
        httpStatus,
      }
    );
  }

  static fromHttpError(
    operation: string,
    httpStatus: number,
    responseBody?: unknown,
    contextDetails?: Record<string, unknown>
  ): FileServiceAdapterException {
    const message = `File service ${operation} failed with HTTP ${httpStatus}`;
    return new FileServiceAdapterException(message, operation, httpStatus, {
      ...contextDetails,
      responseBody,
    });
  }

  static fromTransportError(
    operation: string,
    error: Error,
    contextDetails?: Record<string, unknown>
  ): FileServiceAdapterException {
    const message = `File service ${operation} failed: ${error.message}`;
    return new FileServiceAdapterException(message, operation, undefined, {
      ...contextDetails,
      errorName: error.name,
    });
  }
}

function mapHttpStatusToAlkemioStatus(httpStatus?: number): AlkemioErrorStatus {
  switch (httpStatus) {
    case 400:
      return AlkemioErrorStatus.BAD_USER_INPUT;
    case 404:
      return AlkemioErrorStatus.NOT_FOUND;
    case 409:
      return AlkemioErrorStatus.OPERATION_NOT_ALLOWED;
    case 413:
      return AlkemioErrorStatus.STORAGE_UPLOAD_FAILED;
    case 415:
      return AlkemioErrorStatus.FORMAT_NOT_SUPPORTED;
    case 503:
      return AlkemioErrorStatus.STORAGE_SERVICE_UNAVAILABLE;
    default:
      return AlkemioErrorStatus.UNSPECIFIED;
  }
}
