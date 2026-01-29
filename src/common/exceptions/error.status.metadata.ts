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
  /** i18n translation key for user-friendly message */
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
  userMessage: 'userMessages.fallback',
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
    userMessage: 'userMessages.notFound.entity',
  },
  [AlkemioErrorStatus.NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 102,
    userMessage: 'userMessages.notFound.resource',
  },
  [AlkemioErrorStatus.ACCOUNT_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 103,
    userMessage: 'userMessages.notFound.account',
  },
  [AlkemioErrorStatus.LICENSE_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 104,
    userMessage: 'userMessages.notFound.license',
  },
  [AlkemioErrorStatus.STORAGE_BUCKET_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 105,
    userMessage: 'userMessages.notFound.storageBucket',
  },
  [AlkemioErrorStatus.TAGSET_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 106,
    userMessage: 'userMessages.notFound.tagset',
  },
  [AlkemioErrorStatus.MIME_TYPE_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 107,
    userMessage: 'userMessages.notFound.mimeType',
  },
  [AlkemioErrorStatus.MATRIX_ENTITY_NOT_FOUND_ERROR]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 108,
    userMessage: 'userMessages.notFound.matrixEntity',
  },
  [AlkemioErrorStatus.USER_IDENTITY_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 109,
    userMessage: 'userMessages.notFound.userIdentity',
  },
  [AlkemioErrorStatus.PAGINATION_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    specificCode: 110,
    userMessage: 'userMessages.notFound.pagination',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11xxx - AUTHORIZATION: Auth/permission errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.UNAUTHENTICATED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 101,
    userMessage: 'userMessages.authorization.unauthenticated',
  },
  [AlkemioErrorStatus.UNAUTHORIZED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 102,
    userMessage: 'userMessages.authorization.unauthorized',
  },
  [AlkemioErrorStatus.FORBIDDEN]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 103,
    userMessage: 'userMessages.authorization.forbidden',
  },
  [AlkemioErrorStatus.FORBIDDEN_POLICY]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 104,
    userMessage: 'userMessages.authorization.forbiddenPolicy',
  },
  [AlkemioErrorStatus.FORBIDDEN_LICENSE_POLICY]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 105,
    userMessage: 'userMessages.authorization.forbiddenLicensePolicy',
  },
  [AlkemioErrorStatus.AUTHORIZATION_INVALID_POLICY]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 106,
    userMessage: 'userMessages.authorization.invalidPolicy',
  },
  [AlkemioErrorStatus.AUTHORIZATION_RESET]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 107,
    userMessage: 'userMessages.authorization.authorizationReset',
  },
  [AlkemioErrorStatus.USER_NOT_VERIFIED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 108,
    userMessage: 'userMessages.authorization.userNotVerified',
  },
  [AlkemioErrorStatus.SUBSCRIPTION_USER_NOT_AUTHENTICATED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 109,
    userMessage: 'userMessages.authorization.subscriptionNotAuthenticated',
  },
  [AlkemioErrorStatus.API_RESTRICTED_ACCESS]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 110,
    userMessage: 'userMessages.authorization.apiRestricted',
  },
  [AlkemioErrorStatus.INVALID_TOKEN]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 111,
    userMessage: 'userMessages.authorization.invalidToken',
  },
  [AlkemioErrorStatus.BEARER_TOKEN]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 112,
    userMessage: 'userMessages.authorization.bearerToken',
  },
  [AlkemioErrorStatus.SESSION_EXPIRED]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 113,
    userMessage: 'userMessages.authorization.sessionExpired',
  },
  [AlkemioErrorStatus.SESSION_EXTEND]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 114,
    userMessage: 'userMessages.authorization.sessionExtend',
  },
  [AlkemioErrorStatus.LOGIN_FLOW]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 115,
    userMessage: 'userMessages.authorization.loginFlow',
  },
  [AlkemioErrorStatus.LOGIN_FLOW_INIT]: {
    category: ErrorCategory.AUTHORIZATION,
    specificCode: 116,
    userMessage: 'userMessages.authorization.loginFlowInit',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12xxx - VALIDATION: Input/state validation errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.BAD_USER_INPUT]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 101,
    userMessage: 'userMessages.validation.badUserInput',
  },
  [AlkemioErrorStatus.INPUT_VALIDATION_ERROR]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 102,
    userMessage: 'userMessages.validation.inputValidation',
  },
  [AlkemioErrorStatus.INVALID_UUID]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 103,
    userMessage: 'userMessages.validation.invalidUuid',
  },
  [AlkemioErrorStatus.FORMAT_NOT_SUPPORTED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 104,
    userMessage: 'userMessages.validation.formatNotSupported',
  },
  [AlkemioErrorStatus.INVALID_STATE_TRANSITION]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 105,
    userMessage: 'userMessages.validation.invalidStateTransition',
  },
  [AlkemioErrorStatus.INVALID_TEMPLATE_TYPE]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 106,
    userMessage: 'userMessages.validation.invalidTemplateType',
  },
  [AlkemioErrorStatus.GROUP_NOT_INITIALIZED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 107,
    userMessage: 'userMessages.validation.groupNotInitialized',
  },
  [AlkemioErrorStatus.ENTITY_NOT_INITIALIZED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 108,
    userMessage: 'userMessages.validation.entityNotInitialized',
  },
  [AlkemioErrorStatus.RELATION_NOT_LOADED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 109,
    userMessage: 'userMessages.validation.relationNotLoaded',
  },
  [AlkemioErrorStatus.PAGINATION_INPUT_OUT_OF_BOUND]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 110,
    userMessage: 'userMessages.validation.paginationOutOfBound',
  },
  [AlkemioErrorStatus.PAGINATION_PARAM_NOT_FOUND]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 111,
    userMessage: 'userMessages.validation.paginationParamNotFound',
  },
  [AlkemioErrorStatus.FORUM_DISCUSSION_CATEGORY]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 113,
    userMessage: 'userMessages.validation.forumDiscussionCategory',
  },
  [AlkemioErrorStatus.NOT_SUPPORTED]: {
    category: ErrorCategory.VALIDATION,
    specificCode: 114,
    userMessage: 'userMessages.validation.notSupported',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13xxx - OPERATIONS: Business rule violations
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.OPERATION_NOT_ALLOWED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 101,
    userMessage: 'userMessages.operations.operationNotAllowed',
  },
  [AlkemioErrorStatus.NOT_ENABLED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 102,
    userMessage: 'userMessages.operations.notEnabled',
  },
  [AlkemioErrorStatus.MESSAGING_NOT_ENABLED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 103,
    userMessage: 'userMessages.operations.messagingNotEnabled',
  },
  [AlkemioErrorStatus.ROLE_SET_ROLE]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 104,
    userMessage: 'userMessages.operations.roleSetRole',
  },
  [AlkemioErrorStatus.ROLE_SET_INVITATION]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 105,
    userMessage: 'userMessages.operations.roleSetInvitation',
  },
  [AlkemioErrorStatus.ROLE_SET_POLICY_ROLE_LIMITS_VIOLATED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 106,
    userMessage: 'userMessages.operations.roleLimitsViolated',
  },
  [AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_AVAILABLE]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 107,
    userMessage: 'userMessages.operations.licenseEntitlementNotAvailable',
  },
  [AlkemioErrorStatus.LICENSE_ENTITLEMENT_NOT_SUPPORTED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 108,
    userMessage: 'userMessages.operations.licenseEntitlementNotSupported',
  },
  [AlkemioErrorStatus.CALLOUT_CLOSED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 109,
    userMessage: 'userMessages.operations.calloutClosed',
  },
  [AlkemioErrorStatus.USER_ALREADY_REGISTERED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 110,
    userMessage: 'userMessages.operations.userAlreadyRegistered',
  },
  [AlkemioErrorStatus.USER_NOT_REGISTERED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 111,
    userMessage: 'userMessages.operations.userNotRegistered',
  },
  [AlkemioErrorStatus.NO_AGENT_FOR_USER]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 112,
    userMessage: 'userMessages.operations.noAgentForUser',
  },
  [AlkemioErrorStatus.USER_IDENTITY_DELETION_FAILED]: {
    category: ErrorCategory.OPERATIONS,
    specificCode: 113,
    userMessage: 'userMessages.operations.userIdentityDeletionFailed',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 14xxx - SYSTEM: Infrastructure errors
  // ═══════════════════════════════════════════════════════════════════════════
  [AlkemioErrorStatus.BOOTSTRAP_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 101,
    userMessage: 'userMessages.system.bootstrapFailed',
  },
  [AlkemioErrorStatus.NOTIFICATION_PAYLOAD_BUILDER_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 102,
    userMessage: 'userMessages.system.notificationPayloadBuilder',
  },
  [AlkemioErrorStatus.GEO_LOCATION_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 103,
    userMessage: 'userMessages.system.geoLocationError',
  },
  [AlkemioErrorStatus.GEO_SERVICE_NOT_AVAILABLE]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 104,
    userMessage: 'userMessages.system.geoServiceNotAvailable',
  },
  [AlkemioErrorStatus.GEO_SERVICE_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 105,
    userMessage: 'userMessages.system.geoServiceError',
  },
  [AlkemioErrorStatus.GEO_SERVICE_REQUEST_LIMIT_EXCEEDED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 106,
    userMessage: 'userMessages.system.geoServiceRequestLimit',
  },
  [AlkemioErrorStatus.STORAGE_DISABLED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 107,
    userMessage: 'userMessages.system.storageDisabled',
  },
  [AlkemioErrorStatus.STORAGE_UPLOAD_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 108,
    userMessage: 'userMessages.system.storageUploadFailed',
  },
  [AlkemioErrorStatus.LOCAL_STORAGE_SAVE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 109,
    userMessage: 'userMessages.system.localStorageSaveFailed',
  },
  [AlkemioErrorStatus.LOCAL_STORAGE_READ_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 110,
    userMessage: 'userMessages.system.localStorageReadFailed',
  },
  [AlkemioErrorStatus.LOCAL_STORAGE_DELETE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 111,
    userMessage: 'userMessages.system.localStorageDeleteFailed',
  },
  [AlkemioErrorStatus.DOCUMENT_SAVE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 112,
    userMessage: 'userMessages.system.documentSaveFailed',
  },
  [AlkemioErrorStatus.DOCUMENT_READ_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 113,
    userMessage: 'userMessages.system.documentReadFailed',
  },
  [AlkemioErrorStatus.DOCUMENT_DELETE_FAILED]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 114,
    userMessage: 'userMessages.system.documentDeleteFailed',
  },
  [AlkemioErrorStatus.URL_RESOLVER_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 115,
    userMessage: 'userMessages.system.urlResolverError',
  },
  [AlkemioErrorStatus.EXCALIDRAW_AMQP_RESULT_ERROR]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 116,
    userMessage: 'userMessages.system.excalidrawAmqpResult',
  },
  [AlkemioErrorStatus.EXCALIDRAW_REDIS_ADAPTER_INIT]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 117,
    userMessage: 'userMessages.system.excalidrawRedisAdapterInit',
  },
  [AlkemioErrorStatus.EXCALIDRAW_SERVER_INIT]: {
    category: ErrorCategory.SYSTEM,
    specificCode: 118,
    userMessage: 'userMessages.system.excalidrawServerInit',
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
