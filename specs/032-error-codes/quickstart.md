# Quickstart: 5-Digit Numeric Error Code System

**Date**: 2026-01-22
**Feature**: 032-error-codes

## Overview

This guide explains how to implement the 5-digit numeric error code system for the Alkemio server.

---

## Step 1: Create Error Category Enum

**File**: `src/common/enums/error.category.ts`

```typescript
export enum ErrorCategory {
  NOT_FOUND = 10, // 10xxx
  AUTHORIZATION = 11, // 11xxx
  VALIDATION = 12, // 12xxx
  OPERATIONS = 13, // 13xxx
  SYSTEM = 14, // 14xxx
  FALLBACK = 99, // 99xxx
}
```

Export from `src/common/enums/index.ts`.

---

## Step 2: Create Error Status Metadata

**File**: `src/common/exceptions/error.status.metadata.ts`

```typescript
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
  // 10xxx - NOT_FOUND
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
  // ... (complete mapping - see error.status.metadata.ts for full list)

  // 99xxx - FALLBACK
  [AlkemioErrorStatus.UNSPECIFIED]: FALLBACK_METADATA,
};

/**
 * Get metadata for a given AlkemioErrorStatus.
 * Returns FALLBACK_METADATA if status is not mapped.
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
```

---

## Step 3: Modify BaseException

**File**: `src/common/exceptions/base.exception.ts`

Add `numericCode` and `userMessage` to the extensions:

```typescript
import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { ExceptionDetails } from './exception.details';
import {
  getMetadataForStatus,
  computeNumericCode,
} from './error.status.metadata';

export class BaseException extends GraphQLError {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public message: string,
    public context: LogContext,
    public code: AlkemioErrorStatus,
    public details?: ExceptionDetails,
    public errorId: string = randomUUID()
  ) {
    const metadata = getMetadataForStatus(code);
    const numericCode = computeNumericCode(metadata);
    super(message, {
      extensions: {
        code: String(code),
        numericCode, // NEW
        userMessage: metadata.userMessage, // NEW - i18n key
        errorId,
        details,
      },
    });
    this.name = this.constructor.name;
  }
}
```

---

## Step 4: Modify BaseHttpException

**File**: `src/common/exceptions/http/base.http.exception.ts`

Apply the same pattern for HTTP exceptions.

---

## Step 5: Fallback Handling

**Note**: The `getMetadataForStatus()` function returns `FALLBACK_METADATA` for unmapped errors, which results in code 99999. Logging of unmapped errors is handled by the exception filter layer using the standard Winston logger.

No additional initialization is required - fallback metadata is available at module load time.

---

## Step 6: Create Documentation

**File**: `docs/error-codes.md`

Document all error codes for support and frontend teams. Include:

- Complete code mapping table
- Category explanations
- Examples

---

## Step 7: Add Unit Tests

**File**: `src/common/exceptions/error.status.metadata.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { AlkemioErrorStatus, ErrorCategory } from '@common/enums';
import {
  getMetadataForStatus,
  computeNumericCode,
  validateRegistryCompleteness,
  FALLBACK_METADATA,
} from '@common/exceptions/error.status.metadata';

describe('ErrorStatusMetadata', () => {
  it('should map all AlkemioErrorStatus values', () => {
    const unmapped = validateRegistryCompleteness();
    expect(unmapped).toEqual([]);
  });

  it('should return correct numeric code for ENTITY_NOT_FOUND', () => {
    const metadata = getMetadataForStatus(AlkemioErrorStatus.ENTITY_NOT_FOUND);
    expect(computeNumericCode(metadata)).toBe(10101);
  });

  it('should return fallback metadata for unknown status', () => {
    const metadata = getMetadataForStatus(
      'UNKNOWN_STATUS' as AlkemioErrorStatus
    );
    expect(metadata).toBe(FALLBACK_METADATA);
    expect(computeNumericCode(metadata)).toBe(99999);
  });

  it('should have all codes in valid range (10000-99999)', () => {
    for (const status of Object.values(AlkemioErrorStatus)) {
      const metadata = getMetadataForStatus(status);
      const code = computeNumericCode(metadata);
      expect(code).toBeGreaterThanOrEqual(10000);
      expect(code).toBeLessThanOrEqual(99999);
    }
  });

  it('should have first two digits matching category', () => {
    for (const status of Object.values(AlkemioErrorStatus)) {
      const metadata = getMetadataForStatus(status);
      const numericCode = computeNumericCode(metadata);
      const firstTwoDigits = Math.floor(numericCode / 1000);
      expect(firstTwoDigits).toBe(metadata.category);
    }
  });

  it('should use i18n keys for userMessage (no dynamic IDs)', () => {
    for (const status of Object.values(AlkemioErrorStatus)) {
      const metadata = getMetadataForStatus(status);
      // userMessage should be an i18n key, not contain dynamic data like errorId
      expect(metadata.userMessage).toMatch(/^userMessages\./);
      expect(metadata.userMessage).not.toContain('{{errorId}}');
    }
  });

  it('should map category codes correctly (10=NOT_FOUND, 11=AUTH, 12=VALIDATION, 13=OPS, 14=SYSTEM)', () => {
    // NOT_FOUND codes should be 10xxx
    const notFound = getMetadataForStatus(AlkemioErrorStatus.ENTITY_NOT_FOUND);
    expect(notFound.category).toBe(ErrorCategory.NOT_FOUND);
    expect(computeNumericCode(notFound)).toBeGreaterThanOrEqual(10000);
    expect(computeNumericCode(notFound)).toBeLessThan(11000);

    // AUTHORIZATION codes should be 11xxx
    const auth = getMetadataForStatus(AlkemioErrorStatus.FORBIDDEN_POLICY);
    expect(auth.category).toBe(ErrorCategory.AUTHORIZATION);
    expect(computeNumericCode(auth)).toBeGreaterThanOrEqual(11000);
    expect(computeNumericCode(auth)).toBeLessThan(12000);

    // VALIDATION codes should be 12xxx
    const validation = getMetadataForStatus(AlkemioErrorStatus.BAD_USER_INPUT);
    expect(validation.category).toBe(ErrorCategory.VALIDATION);
    expect(computeNumericCode(validation)).toBeGreaterThanOrEqual(12000);
    expect(computeNumericCode(validation)).toBeLessThan(13000);

    // OPERATIONS codes should be 13xxx
    const ops = getMetadataForStatus(AlkemioErrorStatus.CALLOUT_CLOSED);
    expect(ops.category).toBe(ErrorCategory.OPERATIONS);
    expect(computeNumericCode(ops)).toBeGreaterThanOrEqual(13000);
    expect(computeNumericCode(ops)).toBeLessThan(14000);

    // SYSTEM codes should be 14xxx
    const system = getMetadataForStatus(AlkemioErrorStatus.BOOTSTRAP_FAILED);
    expect(system.category).toBe(ErrorCategory.SYSTEM);
    expect(computeNumericCode(system)).toBeGreaterThanOrEqual(14000);
    expect(computeNumericCode(system)).toBeLessThan(15000);
  });
});
```

---

## Verification Checklist

- [ ] All 71 `AlkemioErrorStatus` values are mapped
- [ ] No duplicate numeric codes
- [ ] First two digits match category for all codes (10=NOT_FOUND, 11=AUTH, 12=VALIDATION, 13=OPS, 14=SYSTEM, 99=FALLBACK)
- [ ] `numericCode` appears in GraphQL error extensions
- [ ] `userMessage` (i18n key) appears in GraphQL error extensions
- [ ] Fallback code (99999) works for unmapped errors
- [ ] Dynamic identifiers (e.g., `errorId`) are in structured extension fields, not in `userMessage`
- [ ] Existing `code` field unchanged (backward compatibility)
- [ ] Unit tests pass
- [ ] Documentation complete

---

## Example API Response

**Before**:

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "extensions": {
        "code": "ENTITY_NOT_FOUND",
        "errorId": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ]
}
```

**After**:

```json
{
  "errors": [
    {
      "message": "Entity not found",
      "extensions": {
        "code": "ENTITY_NOT_FOUND",
        "numericCode": 10101,
        "userMessage": "userMessages.notFound.entity",
        "errorId": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ]
}
```
