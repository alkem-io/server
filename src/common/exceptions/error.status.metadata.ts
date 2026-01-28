import { AlkemioErrorStatus, ErrorCategory } from '@common/enums';

/**
 * Metadata for computing error codes and user-facing messages.
 * Single source of truth: AlkemioErrorStatus → ErrorMetadata mapping.
 */
export interface ErrorMetadata {
  /** Category prefix (10 - 99) */
  category: ErrorCategory;
  /** Specific code within category (100 - 999) */
  specificCode: number;
  /** User-friendly message. Supports {{message}} and {{errorId}} placeholders */
  userMessage: string;
}

/**
 * Compute the 5-digit numeric code from metadata.
 * Format: category * 1000 + specificCode (e.g., 10 * 1000 + 101 = 10101)
 */
export function computeNumericCode(metadata: ErrorMetadata): number {
  return metadata.category * 1000 + metadata.specificCode;
}

/** Fallback metadata for unmapped errors and UNSPECIFIED status */
export const FALLBACK_METADATA: ErrorMetadata = {
  category: ErrorCategory.FALLBACK,
  specificCode: 999,
  userMessage: 'An unexpected error occurred. Reference: {{errorId}}',
};

/**
 * Complete mapping from AlkemioErrorStatus to ErrorMetadata.
 * This is the single source of truth for error codes and user messages.
 */
const STATUS_METADATA: Record<AlkemioErrorStatus, ErrorMetadata> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // 10xxx - NOT_FOUND: Entity/resource not found errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.ENTITY_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 101,
    userMessage: "Couldn't find what you were looking for.",
  },
  [AlkemioErrorStatus.NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 102,
    userMessage: 'Resource not found.',
  },
  [AlkemioErrorStatus.ACCOUNT_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 103,
    userMessage: 'Account not found.',
  },
  [AlkemioErrorStatus.LICENSE_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 104,
    userMessage: 'License not found.',
  },
  [AlkemioErrorStatus.STORAGE_BUCKET_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 105,
    userMessage: 'Storage bucket not found.',
  },
  [AlkemioErrorStatus.TAGSET_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 106,
    userMessage: 'Tagset not found.',
  },
  [AlkemioErrorStatus.MIME_TYPE_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 107,
    userMessage: 'MIME type not found.',
  },
  [AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 108,
    userMessage: 'Matrix entity not found.',
  },
  [AlkemioErrorStatus.USER_IDENTITY_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 109,
    userMessage: 'User identity not found.',
  },
  [AlkemioErrorStatus.PAGINATION_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 110,
    userMessage: 'Pagination cursor not found.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11xxx - AUTHORIZATION: Auth/permission errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.UNAUTHENTICATED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 101,
    userMessage: 'You might not be logged in.',
  },
  [AlkemioErrorStatus.UNAUTHORIZED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 102,
    userMessage: 'Access denied.',
  },
  [AlkemioErrorStatus.FORBIDDEN]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 103,
    userMessage: 'Access denied.',
  },
  [AlkemioErrorStatus.FORBIDDEN_POLICY]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 104,
    userMessage: "You don't have the correct rights.",
  },
  [AlkemioErrorStatus.FORBIDDEN_LICENSE_POLICY]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 105,
    userMessage: 'License restriction.',
  },
  [AlkemioErrorStatus.AUTHORIZATION_INVALID_POLICY]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 106,
    userMessage: 'Invalid authorization policy.',
  },
  [AlkemioErrorStatus.AUTHORIZATION_RESET]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 107,
    userMessage: 'Authorization reset in progress.',
  },
  [AlkemioErrorStatus.USER_NOT_VERIFIED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 108,
    userMessage: 'User is not verified.',
  },
  [AlkemioErrorStatus.SUBSCRIPTION_USER_NOT_AUTHENTICATED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 109,
    userMessage: 'Subscription requires authentication.',
  },
  [AlkemioErrorStatus.API_RESTRICTED_ACCESS]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 110,
    userMessage: 'API access restricted.',
  },
  [AlkemioErrorStatus.INVALID_TOKEN]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 111,
    userMessage: 'Invalid token.',
  },
  [AlkemioErrorStatus.BEARER_TOKEN]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 112,
    userMessage: 'Bearer token error.',
  },
  [AlkemioErrorStatus.SESSION_EXPIRED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 113,
    userMessage: 'Session expired.',
  },
  [AlkemioErrorStatus.SESSION_EXTEND]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 114,
    userMessage: 'Unable to extend session.',
  },
  [AlkemioErrorStatus.LOGIN_FLOW]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 115,
    userMessage: 'Login flow error.',
  },
  [AlkemioErrorStatus.LOGIN_FLOW_INIT]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 116,
    userMessage: 'Unable to initialize login flow.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12xxx - VALIDATION: Input/state validation errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.BAD_USER_INPUT]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 101,
    userMessage: '{{message}}',
  },
  [AlkemioErrorStatus.INPUT_VALIDATION_ERROR]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 102,
    userMessage: 'Input validation error.',
  },
  [AlkemioErrorStatus.INVALID_UUID]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 103,
    userMessage: 'Invalid identifier format.',
  },
  [AlkemioErrorStatus.FORMAT_NOT_SUPPORTED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 104,
    userMessage: 'Format not supported.',
  },
  [AlkemioErrorStatus.INVALID_STATE_TRANSITION]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 105,
    userMessage: 'Invalid state transition.',
  },
  [AlkemioErrorStatus.INVALID_TEMPLATE_TYPE]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 106,
    userMessage: 'Invalid template type.',
  },
  [AlkemioErrorStatus.GROUP_NOT_INITIALIZED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 107,
    userMessage: 'Group not initialized.',
  },
  [AlkemioErrorStatus.ENTITY_NOT_INITIALIZED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 108,
    userMessage: 'Entity not initialized.',
  },
  [AlkemioErrorStatus.RELATION_NOT_LOADED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 109,
    userMessage: 'Relation not loaded.',
  },
  [AlkemioErrorStatus.PAGINATION_INPUT_OUT_OF_BOUND]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 110,
    userMessage: 'Pagination input out of bounds.',
  },
  [AlkemioErrorStatus.PAGINATION_PARAM_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 111,
    userMessage: 'Pagination parameter not found.',
  },
  [AlkemioErrorStatus.FORUM_DISCUSSION_CATEGORY]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 113,
    userMessage: 'Invalid discussion category.',
  },
  [AlkemioErrorStatus.NOT_SUPPORTED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 114,
    userMessage: 'Operation not supported.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13xxx - OPERATIONS: Business rule violations
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.OPERATION_NOT_ALLOWED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 101,
    userMessage: 'Operation not allowed.',
  },
  [AlkemioErrorStatus.NOT_ENABLED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 102,
    userMessage: 'Feature not enabled.',
  },
  [AlkemioErrorStatus.MESSAGING_NOT_ENABLED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 103,
    userMessage: 'Messaging not enabled.',
  },
  [AlkemioErrorStatus.ROLE_SET_ROLE]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 104,
    userMessage: 'Role set error.',
  },
  [AlkemioErrorStatus.ROLE_SET_INVITATION]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 105,
    userMessage: 'Invitation error.',
  },
  [AlkemioErrorStatus.ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 106,
    userMessage: 'Role limits exceeded.',
  },
  [AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 107,
    userMessage: 'License entitlement not available.',
  },
  [AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_SUPPORTED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 108,
    userMessage: 'License entitlement not supported.',
  },
  [AlkemioErrorStatus.CALLOUT_CLOSED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 109,
    userMessage: 'Callout is closed.',
  },
  [AlkemioErrorStatus.USER_ALREADY_REGISTERED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 110,
    userMessage: 'User already registered.',
  },
  [AlkemioErrorStatus.USER_NOT_REGISTERED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 111,
    userMessage: 'User not registered.',
  },
  [AlkemioErrorStatus.NO_AGENT_FOR_USER]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 112,
    userMessage: 'No agent for user.',
  },
  [AlkemioErrorStatus.USER_IDENTITY_DELETION_FAILED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 113,
    userMessage: 'User identity deletion failed.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 14xxx - SYSTEM: Infrastructure errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.BOOTSTRAP_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 101,
    userMessage: 'System initialization failed.',
  },
  [AlkemioErrorStatus.NOTIFICATION_PAYLOAD_BUILDER_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 102,
    userMessage: 'Notification error.',
  },
  [AlkemioErrorStatus.GEO_LOCATION_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 103,
    userMessage: 'Geolocation error.',
  },
  [AlkemioErrorStatus.GEO_SERVICE_NOT_AVAILABLE]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 104,
    userMessage: 'Geolocation service not available.',
  },
  [AlkemioErrorStatus.GEO_SERVICE_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 105,
    userMessage: 'Geolocation service error.',
  },
  [AlkemioErrorStatus.GEO_SERVICE_REQUEST_LIMIT_EXCEEDED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 106,
    userMessage: 'Geolocation request limit exceeded.',
  },
  [AlkemioErrorStatus.STORAGE_DISABLED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 107,
    userMessage: 'Storage is disabled.',
  },
  [AlkemioErrorStatus.STORAGE_UPLOAD_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 108,
    userMessage: 'Upload failed.',
  },
  [AlkemioErrorStatus.LOCAL_STORAGE_SAVE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 109,
    userMessage: 'Local storage save failed.',
  },
  [AlkemioErrorStatus.LOCAL_STORAGE_READ_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 110,
    userMessage: 'Local storage read failed.',
  },
  [AlkemioErrorStatus.LOCAL_STORAGE_DELETE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 111,
    userMessage: 'Local storage delete failed.',
  },
  [AlkemioErrorStatus.DOCUMENT_SAVE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 112,
    userMessage: 'Document save failed.',
  },
  [AlkemioErrorStatus.DOCUMENT_READ_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 113,
    userMessage: 'Document read failed.',
  },
  [AlkemioErrorStatus.DOCUMENT_DELETE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 114,
    userMessage: 'Document delete failed.',
  },
  [AlkemioErrorStatus.URL_RESOLVER_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 115,
    userMessage: 'URL resolver error.',
  },
  [AlkemioErrorStatus.EXCALIDRAW_AMQP_RESULT_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 116,
    userMessage: 'Excalidraw service error.',
  },
  [AlkemioErrorStatus.EXCALIDRAW_REDIS_ADAPTER_INIT]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 117,
    userMessage: 'Excalidraw initialization error.',
  },
  [AlkemioErrorStatus.EXCALIDRAW_SERVER_INIT]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 118,
    userMessage: 'Excalidraw server initialization error.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 99xxx - FALLBACK: Unmapped errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.UNSPECIFIED]: FALLBACK_METADATA,
};

/**
 * Get metadata for a given AlkemioErrorStatus.
 * Returns FALLBACK_METADATA if status is not mapped (should not happen in practice).
 */
export function getMetadataForStatus(
  status: AlkemioErrorStatus
): ErrorMetadata {
  return STATUS_METADATA[status] ?? FALLBACK_METADATA;
}

/**
 * Validate that all AlkemioErrorStatus values are mapped.
 * Used in tests to ensure completeness.
 */
export function validateRegistryCompleteness(): string[] {
  const unmapped: string[] = [];
  for (const status of Object.values(AlkemioErrorStatus)) {
    if (!(status in STATUS_METADATA)) {
      unmapped.push(status);
    }
  }
  return unmapped;
}

/**
 * Validate that all numeric codes are unique.
 * Used in tests to ensure no collisions.
 */
export function validateUniqueNumericCodes(): {
  code: number;
  statuses: string[];
}[] {
  const codeToStatuses = new Map<number, string[]>();

  for (const [status, metadata] of Object.entries(STATUS_METADATA)) {
    const numericCode = computeNumericCode(metadata);
    const existing = codeToStatuses.get(numericCode) ?? [];
    existing.push(status);
    codeToStatuses.set(numericCode, existing);
  }

  const duplicates: { code: number; statuses: string[] }[] = [];
  for (const [code, statuses] of codeToStatuses) {
    if (statuses.length > 1) {
      duplicates.push({ code, statuses });
    }
  }

  return duplicates;
}
