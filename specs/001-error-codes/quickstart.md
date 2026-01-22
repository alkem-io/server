# Quickstart: 5-Digit Numeric Error Code System

**Date**: 2026-01-22
**Feature**: 001-error-codes

## Overview

This guide explains how to implement the 5-digit numeric error code system for the Alkemio server.

---

## Step 1: Create Error Category Enum

**File**: `src/common/enums/error.category.ts`

```typescript
export enum ErrorCategory {
  NOT_FOUND = 10, // 10xxx
  AUTHORIZATION = 20, // 20xxx
  VALIDATION = 30, // 30xxx
  OPERATIONS = 40, // 40xxx
  SYSTEM = 50, // 50xxx
  FALLBACK = 99, // 99xxx
}
```

Export from `src/common/enums/index.ts`.

---

## Step 2: Create Error Code Registry

**File**: `src/common/exceptions/error.code.registry.ts`

```typescript
import { AlkemioErrorStatus } from '@common/enums';
import { ErrorCategory } from '@common/enums/error.category';
import { LogContext } from '@common/enums';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface ErrorCodeEntry {
  numericCode: number;
  category: ErrorCategory;
  userMessage: string;
}

const ERROR_CODE_REGISTRY: ReadonlyMap<AlkemioErrorStatus, ErrorCodeEntry> =
  new Map([
    // 10xxx - NOT_FOUND
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
    // ... (complete mapping - see research.md for full list)

    // 99xxx - FALLBACK
    [
      AlkemioErrorStatus.UNSPECIFIED,
      {
        numericCode: 99999,
        category: ErrorCategory.FALLBACK,
        userMessage: 'An unexpected error occurred. Reference: {{errorId}}',
      },
    ],
  ]);

// Logger instance for fallback warnings
let logger: Logger | undefined;

export function setErrorCodeLogger(loggerInstance: Logger): void {
  logger = loggerInstance;
}

export function getNumericCode(status: AlkemioErrorStatus): number {
  const entry = ERROR_CODE_REGISTRY.get(status);
  if (!entry) {
    // FR-006: Log warning for unmapped errors
    logger?.warn(
      `Unmapped error code: ${status}. Using fallback code 99999.`,
      LogContext.CODE_ERRORS
    );
    return 99999;
  }
  return entry.numericCode;
}

export function getErrorCodeEntry(
  status: AlkemioErrorStatus
): ErrorCodeEntry | undefined {
  return ERROR_CODE_REGISTRY.get(status);
}

// For testing: verify all enum values are mapped
export function validateRegistryCompleteness(): string[] {
  const unmapped: string[] = [];
  for (const status of Object.values(AlkemioErrorStatus)) {
    if (!ERROR_CODE_REGISTRY.has(status)) {
      unmapped.push(status);
    }
  }
  return unmapped;
}
```

---

## Step 3: Modify BaseException

**File**: `src/common/exceptions/base.exception.ts`

Add `numericCode` to the extensions:

```typescript
import { GraphQLError } from 'graphql';
import { randomUUID } from 'crypto';
import { LogContext, AlkemioErrorStatus } from '@common/enums';
import { ExceptionDetails } from './exception.details';
import { getNumericCode } from './error.code.registry';

export class BaseException extends GraphQLError {
  private readonly exceptionName = this.constructor.name;
  constructor(
    public message: string,
    public context: LogContext,
    public code: AlkemioErrorStatus,
    public details?: ExceptionDetails,
    public errorId: string = randomUUID()
  ) {
    const numericCode = getNumericCode(code);
    super(message, {
      extensions: {
        code: String(code),
        numericCode, // NEW
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

## Step 5: Initialize Logger

**File**: `src/app.module.ts` or bootstrap

Initialize the error code logger during application startup:

```typescript
import { setErrorCodeLogger } from '@common/exceptions/error.code.registry';

// In bootstrap or module initialization
setErrorCodeLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
```

---

## Step 6: Create Documentation

**File**: `docs/error-codes.md`

Document all error codes for support and frontend teams. Include:

- Complete code mapping table
- Category explanations
- Examples

---

## Step 7: Add Unit Tests

**File**: `test/unit/common/exceptions/error.code.registry.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { AlkemioErrorStatus } from '@common/enums';
import {
  getNumericCode,
  validateRegistryCompleteness,
  getErrorCodeEntry,
} from '@common/exceptions/error.code.registry';

describe('ErrorCodeRegistry', () => {
  it('should map all AlkemioErrorStatus values', () => {
    const unmapped = validateRegistryCompleteness();
    expect(unmapped).toEqual([]);
  });

  it('should return correct numeric code for ENTITY_NOT_FOUND', () => {
    expect(getNumericCode(AlkemioErrorStatus.ENTITY_NOT_FOUND)).toBe(10101);
  });

  it('should return fallback code for unknown status', () => {
    expect(getNumericCode('UNKNOWN_STATUS' as AlkemioErrorStatus)).toBe(99999);
  });

  it('should have all codes in valid range', () => {
    for (const status of Object.values(AlkemioErrorStatus)) {
      const code = getNumericCode(status);
      expect(code).toBeGreaterThanOrEqual(10000);
      expect(code).toBeLessThanOrEqual(99999);
    }
  });

  it('should have unique numeric codes', () => {
    const codes = new Set<number>();
    for (const status of Object.values(AlkemioErrorStatus)) {
      const entry = getErrorCodeEntry(status);
      if (entry) {
        expect(codes.has(entry.numericCode)).toBe(false);
        codes.add(entry.numericCode);
      }
    }
  });

  it('should have first two digits matching category', () => {
    for (const status of Object.values(AlkemioErrorStatus)) {
      const entry = getErrorCodeEntry(status);
      if (entry) {
        const firstTwoDigits = Math.floor(entry.numericCode / 1000);
        expect(firstTwoDigits).toBe(entry.category);
      }
    }
  });
});
```

---

## Verification Checklist

- [ ] All 72 `AlkemioErrorStatus` values are mapped
- [ ] No duplicate numeric codes
- [ ] First two digits match category for all codes
- [ ] `numericCode` appears in GraphQL error extensions
- [ ] Fallback code (99999) works for unmapped errors
- [ ] Warning logged when fallback is used
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
        "errorId": "550e8400-e29b-41d4-a716-446655440000"
      }
    }
  ]
}
```
