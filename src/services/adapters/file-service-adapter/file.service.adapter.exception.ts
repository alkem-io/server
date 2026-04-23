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
    return new FileServiceAdapterException(
      'File service HTTP error',
      operation,
      httpStatus,
      {
        ...contextDetails,
        responseBody,
      }
    );
  }

  static fromTransportError(
    operation: string,
    error: Error,
    contextDetails?: Record<string, unknown>
  ): FileServiceAdapterException {
    return new FileServiceAdapterException(
      'File service transport error',
      operation,
      undefined,
      {
        ...contextDetails,
        errorName: error.name,
        errorMessage: error.message,
      }
    );
  }
}

function mapHttpStatusToAlkemioStatus(httpStatus?: number): AlkemioErrorStatus {
  switch (httpStatus) {
    case 400:
      return AlkemioErrorStatus.BAD_USER_INPUT;
    case 401:
      return AlkemioErrorStatus.UNAUTHENTICATED;
    case 403:
      return AlkemioErrorStatus.FORBIDDEN;
    case 404:
      return AlkemioErrorStatus.NOT_FOUND;
    case 409:
      return AlkemioErrorStatus.OPERATION_NOT_ALLOWED;
    case 413:
      return AlkemioErrorStatus.STORAGE_UPLOAD_FAILED;
    // 415: unsupported media type (e.g. .exe uploaded).
    // 422: MIME type accepted but content itself is unprocessable
    //      (e.g. image decoder can't read the bytes). Both belong to
    //      the "format / content not usable" family from the caller's
    //      perspective; the distinction only matters to file-service.
    case 415:
    case 422:
      return AlkemioErrorStatus.FORMAT_NOT_SUPPORTED;
    case 503:
      return AlkemioErrorStatus.STORAGE_SERVICE_UNAVAILABLE;
    default:
      return AlkemioErrorStatus.UNSPECIFIED;
  }
}
