import {
  BaseResponse,
  ErrCodeActorNotFound,
  ErrCodeInternalError,
  ErrCodeInvalidParam,
  ErrCodeMatrixError,
  ErrCodeNotAllowed,
  ErrCodeRoomNotFound,
  ErrCodeSpaceNotFound,
  ErrorCode,
  ErrorResponse,
} from '@alkemio/matrix-adapter-lib';

/**
 * Result of processing a batch operation response.
 * Contains overall success status plus per-item results.
 */
export interface BatchOperationResult {
  /** Overall operation success (true if all items succeeded) */
  success: boolean;
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Map of item ID to success/failure status */
  itemResults: Map<string, boolean>;
  /** Map of item ID to error details (only for failed items) */
  itemErrors: Map<string, ErrorResponse>;
}

/**
 * Structured error information extracted from adapter response.
 */
export interface AdapterErrorInfo {
  code: ErrorCode;
  message: string;
  details?: string;
}

/**
 * Map ErrorCode to human-readable description for logging.
 */
export function getErrorCodeDescription(code: ErrorCode): string {
  switch (code) {
    case ErrCodeInvalidParam:
      return 'Invalid parameter provided';
    case ErrCodeRoomNotFound:
      return 'Room not found in communication system';
    case ErrCodeSpaceNotFound:
      return 'Space not found in communication system';
    case ErrCodeActorNotFound:
      return 'Actor not found in communication system';
    case ErrCodeMatrixError:
      return 'Matrix protocol error';
    case ErrCodeInternalError:
      return 'Internal adapter error';
    case ErrCodeNotAllowed:
      return 'Operation not allowed';
    default:
      return `Unknown error code: ${code}`;
  }
}

/**
 * Check if an error code indicates a "not found" condition that may be recoverable.
 */
export function isNotFoundError(code: ErrorCode): boolean {
  return (
    code === ErrCodeRoomNotFound ||
    code === ErrCodeSpaceNotFound ||
    code === ErrCodeActorNotFound
  );
}

/**
 * Check if an error code indicates an invalid input that won't succeed on retry.
 */
export function isValidationError(code: ErrorCode): boolean {
  return code === ErrCodeInvalidParam || code === ErrCodeNotAllowed;
}

/**
 * Extract error information from a BaseResponse.
 * Returns undefined if the response was successful.
 */
export function extractErrorInfo(
  response: BaseResponse
): AdapterErrorInfo | undefined {
  if (response.success || !response.error) {
    return undefined;
  }
  return {
    code: response.error.code,
    message: response.error.message,
    details: response.error.details,
  };
}

/**
 * Process a batch operation response that includes per-item results.
 * Used for batchAddMember, batchRemoveMember, etc.
 */
export function processBatchResponse(response: {
  BaseResponse: BaseResponse;
  results?: { [key: string]: BaseResponse };
}): BatchOperationResult {
  const result: BatchOperationResult = {
    success: response.BaseResponse.success,
    successCount: 0,
    failureCount: 0,
    itemResults: new Map(),
    itemErrors: new Map(),
  };

  if (response.results) {
    for (const [itemId, itemResponse] of Object.entries(response.results)) {
      result.itemResults.set(itemId, itemResponse.success);
      if (itemResponse.success) {
        result.successCount++;
      } else {
        result.failureCount++;
        if (itemResponse.error) {
          result.itemErrors.set(itemId, itemResponse.error);
        }
      }
    }
  }

  return result;
}

/**
 * Format batch operation result for logging.
 */
export function formatBatchResultForLog(result: BatchOperationResult): string {
  const parts: string[] = [
    `success=${result.success}`,
    `succeeded=${result.successCount}`,
    `failed=${result.failureCount}`,
  ];

  if (result.failureCount > 0) {
    const failedIds = Array.from(result.itemErrors.keys()).slice(0, 5);
    const failedSummary = failedIds
      .map(id => {
        const error = result.itemErrors.get(id);
        return `${id}:${error?.code ?? 'unknown'}`;
      })
      .join(', ');
    const ellipsis = result.failureCount > 5 ? '...' : '';
    parts.push(`failures=[${failedSummary}${ellipsis}]`);
  }

  return parts.join(', ');
}

/**
 * Determine if a batch operation should be considered successful.
 * Options:
 * - 'all': Success only if all items succeeded
 * - 'any': Success if at least one item succeeded
 * - 'majority': Success if more than half succeeded
 */
export type BatchSuccessCriteria = 'all' | 'any' | 'majority';

export function isBatchOperationSuccessful(
  result: BatchOperationResult,
  criteria: BatchSuccessCriteria = 'all'
): boolean {
  const total = result.successCount + result.failureCount;

  switch (criteria) {
    case 'all':
      return result.failureCount === 0;
    case 'any':
      return result.successCount > 0;
    case 'majority':
      return result.successCount > total / 2;
    default:
      return result.success;
  }
}
