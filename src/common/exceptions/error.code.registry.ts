import { AlkemioErrorStatus, ErrorCategory } from '@common/enums';

/**
 * Complete metadata for a single error code mapping.
 */
export interface ErrorCodeEntry {
  /** 5-digit numeric code (10000-99999) */
  numericCode: number;
  /** Category derived from first two digits */
  category: ErrorCategory;
  /** User-friendly message template. {{message}} and {{errorId}} are placeholders */
  userMessage: string;
}

/**
 * Complete mapping from AlkemioErrorStatus string codes to 5-digit numeric codes.
 * First two digits indicate category (10=NotFound, 20=Auth, 30=Validation, 40=Operations, 50=System, 99=Fallback).
 * Last three digits are specific code within category (000-999).
 */
export const ERROR_CODE_REGISTRY: ReadonlyMap<
  AlkemioErrorStatus,
  ErrorCodeEntry
> = new Map([
  // ============================================
  // 10xxx - NOT_FOUND (10 codes)
  // ============================================
  [
    AlkemioErrorStatus.ENTITY_NOT_FOUND,
    {
      numericCode: 10101,
      category: ErrorCategory.NOT_FOUND,
      userMessage: "Couldn't find what you were looking for.",
    },
  ],
  [
    AlkemioErrorStatus.NOT_FOUND,
    {
      numericCode: 10102,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'Resource not found.',
    },
  ],
  [
    AlkemioErrorStatus.ACCOUNT_NOT_FOUND,
    {
      numericCode: 10103,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'Account not found.',
    },
  ],
  [
    AlkemioErrorStatus.STORAGE_BUCKET_NOT_FOUND,
    {
      numericCode: 10104,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'Failed to upload reference or link.',
    },
  ],
  [
    AlkemioErrorStatus.TAGSET_NOT_FOUND,
    {
      numericCode: 10105,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'Tag set not found.',
    },
  ],
  [
    AlkemioErrorStatus.MIME_TYPE_NOT_FOUND,
    {
      numericCode: 10106,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'File type not recognized.',
    },
  ],
  [
    AlkemioErrorStatus.LICENSE_NOT_FOUND,
    {
      numericCode: 10107,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'License not found.',
    },
  ],
  [
    AlkemioErrorStatus.PAGINATION_NOT_FOUND,
    {
      numericCode: 10108,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'Page not found.',
    },
  ],
  [
    AlkemioErrorStatus.PAGINATION_PARAM_NOT_FOUND,
    {
      numericCode: 10109,
      category: ErrorCategory.NOT_FOUND,
      userMessage: 'Pagination parameter not found.',
    },
  ],
  [
    AlkemioErrorStatus.URL_RESOLVER_ERROR,
    {
      numericCode: 10110,
      category: ErrorCategory.NOT_FOUND,
      userMessage: "Couldn't find what you were looking for.",
    },
  ],

  // ============================================
  // 20xxx - AUTHORIZATION (15 codes)
  // ============================================
  [
    AlkemioErrorStatus.UNAUTHENTICATED,
    {
      numericCode: 20101,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'You might not be logged in.',
    },
  ],
  [
    AlkemioErrorStatus.UNAUTHORIZED,
    {
      numericCode: 20102,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'You are not authorized for this action.',
    },
  ],
  [
    AlkemioErrorStatus.FORBIDDEN,
    {
      numericCode: 20103,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'Access denied.',
    },
  ],
  [
    AlkemioErrorStatus.FORBIDDEN_POLICY,
    {
      numericCode: 20104,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: "You don't have the correct rights.",
    },
  ],
  [
    AlkemioErrorStatus.FORBIDDEN_LICENSE_POLICY,
    {
      numericCode: 20105,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'License does not permit this action.',
    },
  ],
  [
    AlkemioErrorStatus.AUTHORIZATION_INVALID_POLICY,
    {
      numericCode: 20106,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'Invalid authorization policy.',
    },
  ],
  [
    AlkemioErrorStatus.AUTHORIZATION_RESET,
    {
      numericCode: 20107,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'Authorization has been reset.',
    },
  ],
  [
    AlkemioErrorStatus.API_RESTRICTED_ACCESS,
    {
      numericCode: 20108,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'API access restricted.',
    },
  ],
  [
    AlkemioErrorStatus.SUBSCRIPTION_USER_NOT_AUTHENTICATED,
    {
      numericCode: 20109,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'Subscription requires authentication.',
    },
  ],
  [
    AlkemioErrorStatus.USER_NOT_VERIFIED,
    {
      numericCode: 20110,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'User account not verified.',
    },
  ],
  [
    AlkemioErrorStatus.USER_NOT_REGISTERED,
    {
      numericCode: 20111,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'User not registered.',
    },
  ],
  [
    AlkemioErrorStatus.USER_ALREADY_REGISTERED,
    {
      numericCode: 20112,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'User already registered.',
    },
  ],
  [
    AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR,
    {
      numericCode: 20113,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: "You don't have the correct rights.",
    },
  ],
  [
    AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE,
    {
      numericCode: 20114,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'License entitlement not available.',
    },
  ],
  [
    AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_SUPPORTED,
    {
      numericCode: 20115,
      category: ErrorCategory.AUTHORIZATION,
      userMessage: 'License entitlement not supported.',
    },
  ],

  // ============================================
  // 30xxx - VALIDATION (14 codes)
  // ============================================
  [
    AlkemioErrorStatus.BAD_USER_INPUT,
    {
      numericCode: 30101,
      category: ErrorCategory.VALIDATION,
      userMessage: '{{message}}',
    },
  ],
  [
    AlkemioErrorStatus.INPUT_VALIDATION_ERROR,
    {
      numericCode: 30102,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Invalid input provided.',
    },
  ],
  [
    AlkemioErrorStatus.INVALID_STATE_TRANSITION,
    {
      numericCode: 30103,
      category: ErrorCategory.VALIDATION,
      userMessage: 'This is not allowed as next step.',
    },
  ],
  [
    AlkemioErrorStatus.INVALID_TOKEN,
    {
      numericCode: 30104,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Invalid token.',
    },
  ],
  [
    AlkemioErrorStatus.INVALID_UUID,
    {
      numericCode: 30105,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Invalid identifier format.',
    },
  ],
  [
    AlkemioErrorStatus.INVALID_TEMPLATE_TYPE,
    {
      numericCode: 30106,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Invalid template type.',
    },
  ],
  [
    AlkemioErrorStatus.FORMAT_NOT_SUPPORTED,
    {
      numericCode: 30107,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Format not supported.',
    },
  ],
  [
    AlkemioErrorStatus.ENTITY_NOT_INITIALIZED,
    {
      numericCode: 30108,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Entity not properly initialized.',
    },
  ],
  [
    AlkemioErrorStatus.GROUP_NOT_INITIALIZED,
    {
      numericCode: 30109,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Group not properly initialized.',
    },
  ],
  [
    AlkemioErrorStatus.RELATION_NOT_LOADED,
    {
      numericCode: 30110,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Related data not available.',
    },
  ],
  [
    AlkemioErrorStatus.PAGINATION_INPUT_OUT_OF_BOUND,
    {
      numericCode: 30111,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Pagination out of bounds.',
    },
  ],
  [
    AlkemioErrorStatus.FORUM_DISCUSSION_CATEGORY,
    {
      numericCode: 30112,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Invalid discussion category.',
    },
  ],
  [
    AlkemioErrorStatus.NO_AGENT_FOR_USER,
    {
      numericCode: 30113,
      category: ErrorCategory.VALIDATION,
      userMessage: 'No agent found for user.',
    },
  ],
  [
    AlkemioErrorStatus.NOT_SUPPORTED,
    {
      numericCode: 30114,
      category: ErrorCategory.VALIDATION,
      userMessage: 'Not supported: {{message}}',
    },
  ],

  // ============================================
  // 40xxx - OPERATIONS (12 codes)
  // ============================================
  [
    AlkemioErrorStatus.OPERATION_NOT_ALLOWED,
    {
      numericCode: 40101,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Operation not allowed.',
    },
  ],
  [
    AlkemioErrorStatus.CALLOUT_CLOSED,
    {
      numericCode: 40102,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'This callout is closed.',
    },
  ],
  [
    AlkemioErrorStatus.ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED,
    {
      numericCode: 40103,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Role limits exceeded.',
    },
  ],
  [
    AlkemioErrorStatus.ROLE_SET_ROLE,
    {
      numericCode: 40104,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Role set error.',
    },
  ],
  [
    AlkemioErrorStatus.ROLE_SET_INVITATION,
    {
      numericCode: 40105,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Invitation error.',
    },
  ],
  [
    AlkemioErrorStatus.NOT_ENABLED,
    {
      numericCode: 40106,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Feature not enabled.',
    },
  ],
  [
    AlkemioErrorStatus.MESSAGING_NOT_ENABLED,
    {
      numericCode: 40107,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Messaging not enabled.',
    },
  ],
  [
    AlkemioErrorStatus.LOGIN_FLOW_INIT,
    {
      numericCode: 40108,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Login flow initialization failed.',
    },
  ],
  [
    AlkemioErrorStatus.LOGIN_FLOW,
    {
      numericCode: 40109,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Login flow error.',
    },
  ],
  [
    AlkemioErrorStatus.SESSION_EXTEND,
    {
      numericCode: 40110,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Session extension failed.',
    },
  ],
  [
    AlkemioErrorStatus.SESSION_EXPIRED,
    {
      numericCode: 40111,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Your session has expired.',
    },
  ],
  [
    AlkemioErrorStatus.BEARER_TOKEN,
    {
      numericCode: 40112,
      category: ErrorCategory.OPERATIONS,
      userMessage: 'Bearer token error.',
    },
  ],

  // ============================================
  // 50xxx - SYSTEM/INFRASTRUCTURE (19 codes)
  // ============================================
  [
    AlkemioErrorStatus.BOOTSTRAP_FAILED,
    {
      numericCode: 50101,
      category: ErrorCategory.SYSTEM,
      userMessage: 'System initialization failed.',
    },
  ],
  [
    AlkemioErrorStatus.NOTIFICATION_PAYLOAD_BUILDER_ERROR,
    {
      numericCode: 50102,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Notification error.',
    },
  ],
  [
    AlkemioErrorStatus.GEO_LOCATION_ERROR,
    {
      numericCode: 50103,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Location error.',
    },
  ],
  [
    AlkemioErrorStatus.GEO_SERVICE_NOT_AVAILABLE,
    {
      numericCode: 50104,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Location service unavailable.',
    },
  ],
  [
    AlkemioErrorStatus.GEO_SERVICE_ERROR,
    {
      numericCode: 50105,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Location service error.',
    },
  ],
  [
    AlkemioErrorStatus.GEO_SERVICE_REQUEST_LIMIT_EXCEEDED,
    {
      numericCode: 50106,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Location service limit exceeded.',
    },
  ],
  [
    AlkemioErrorStatus.USER_IDENTITY_NOT_FOUND,
    {
      numericCode: 50107,
      category: ErrorCategory.SYSTEM,
      userMessage: 'User identity not found.',
    },
  ],
  [
    AlkemioErrorStatus.USER_IDENTITY_DELETION_FAILED,
    {
      numericCode: 50108,
      category: ErrorCategory.SYSTEM,
      userMessage: 'User identity deletion failed.',
    },
  ],
  [
    AlkemioErrorStatus.STORAGE_DISABLED,
    {
      numericCode: 50109,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Storage is disabled.',
    },
  ],
  [
    AlkemioErrorStatus.STORAGE_UPLOAD_FAILED,
    {
      numericCode: 50110,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Upload failed.',
    },
  ],
  [
    AlkemioErrorStatus.LOCAL_STORAGE_SAVE_FAILED,
    {
      numericCode: 50111,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Failed to save locally.',
    },
  ],
  [
    AlkemioErrorStatus.LOCAL_STORAGE_READ_FAILED,
    {
      numericCode: 50112,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Failed to read from local storage.',
    },
  ],
  [
    AlkemioErrorStatus.LOCAL_STORAGE_DELETE_FAILED,
    {
      numericCode: 50113,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Failed to delete from local storage.',
    },
  ],
  [
    AlkemioErrorStatus.DOCUMENT_SAVE_FAILED,
    {
      numericCode: 50114,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Failed to save document.',
    },
  ],
  [
    AlkemioErrorStatus.DOCUMENT_READ_FAILED,
    {
      numericCode: 50115,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Failed to read document.',
    },
  ],
  [
    AlkemioErrorStatus.DOCUMENT_DELETE_FAILED,
    {
      numericCode: 50116,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Failed to delete document.',
    },
  ],
  [
    AlkemioErrorStatus.EXCALIDRAW_AMQP_RESULT_ERROR,
    {
      numericCode: 50117,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Whiteboard sync error.',
    },
  ],
  [
    AlkemioErrorStatus.EXCALIDRAW_REDIS_ADAPTER_INIT,
    {
      numericCode: 50118,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Whiteboard initialization error.',
    },
  ],
  [
    AlkemioErrorStatus.EXCALIDRAW_SERVER_INIT,
    {
      numericCode: 50119,
      category: ErrorCategory.SYSTEM,
      userMessage: 'Whiteboard server error.',
    },
  ],

  // ============================================
  // 99xxx - FALLBACK (1 code)
  // ============================================
  [
    AlkemioErrorStatus.UNSPECIFIED,
    {
      numericCode: 99999,
      category: ErrorCategory.FALLBACK,
      userMessage: 'An unexpected error occurred. Reference: {{errorId}}',
    },
  ],
]);

/**
 * Get the complete error code entry for a given AlkemioErrorStatus.
 * Returns undefined if status is not mapped.
 */
export function getErrorCodeEntry(
  status: AlkemioErrorStatus
): ErrorCodeEntry | undefined {
  return ERROR_CODE_REGISTRY.get(status);
}

/**
 * Validate that all AlkemioErrorStatus enum values are mapped.
 * Returns array of unmapped status values (empty if all are mapped).
 * Useful for testing registry completeness.
 */
export function validateRegistryCompleteness(): string[] {
  const unmapped: string[] = [];
  for (const status of Object.values(AlkemioErrorStatus)) {
    if (!ERROR_CODE_REGISTRY.has(status)) {
      unmapped.push(status);
    }
  }
  return unmapped;
}
