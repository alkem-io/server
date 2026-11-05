import { isIP } from 'node:net';
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
        errorName: [
          'Error',
          'AxiosError',
          'AggregateError',
          'TimeoutError',
        ].includes(error.name)
          ? error.name
          : 'Error',
        transportCause: transportCause(error),
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

/** Retain socket diagnostics only; transport objects may contain credentials. */
function transportCause(error: unknown, depth = 0): Record<string, unknown> {
  if (!error || typeof error !== 'object' || depth > 2) return {};
  const source = error as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of ['code', 'syscall']) {
    const value = source[key];
    if (typeof value === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(value)) {
      result[key] = value;
    }
  }
  if (typeof source.errno === 'number' && Number.isFinite(source.errno)) {
    result.errno = source.errno;
  }
  if (typeof source.address === 'string' && isIP(source.address)) {
    result.address = source.address;
  }
  if (
    typeof source.port === 'number' &&
    Number.isInteger(source.port) &&
    source.port >= 0 &&
    source.port <= 65535
  ) {
    result.port = source.port;
  }
  if (depth < 2) {
    const cause = transportCause(source.cause, depth + 1);
    if (Object.keys(cause).length) result.cause = cause;
    if (error instanceof AggregateError) {
      result.errors = error.errors
        .slice(0, 4)
        .map(nested => transportCause(nested, depth + 1));
    }
  }
  return result;
}
