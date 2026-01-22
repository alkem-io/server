# Data Model: 5-Digit Numeric Error Code System

**Date**: 2026-01-22
**Feature**: 001-error-codes

## Overview

This feature introduces compile-time data structures for mapping string-based error codes to 5-digit numeric codes. No database changes are required.

---

## TypeScript Interfaces

### ErrorCategory

Enumeration of error categories determined by the first two digits of the numeric code.

```typescript
export enum ErrorCategory {
  NOT_FOUND = 10, // 10xxx - Entity/resource not found
  AUTHORIZATION = 20, // 20xxx - Auth/permission errors
  VALIDATION = 30, // 30xxx - Input/state validation
  OPERATIONS = 40, // 40xxx - Business rule violations
  SYSTEM = 50, // 50xxx - Infrastructure errors
  FALLBACK = 99, // 99xxx - Unmapped errors
}
```

### ErrorCodeEntry

Complete metadata for a single error code mapping.

```typescript
export interface ErrorCodeEntry {
  /** 5-digit numeric code (10000-99999) */
  numericCode: number;

  /** Category derived from first two digits */
  category: ErrorCategory;

  /** User-friendly message template. {{message}} and {{errorId}} are placeholders */
  userMessage: string;
}
```

### ErrorCodeRegistry

The complete mapping from string codes to numeric codes.

```typescript
export type ErrorCodeRegistry = ReadonlyMap<AlkemioErrorStatus, ErrorCodeEntry>;
```

---

## Data Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AlkemioErrorStatus                           │
│                    (existing enum - unchanged)                      │
│                        72 string values                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ 1:1 mapping
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ERROR_CODE_REGISTRY                           │
│                    Map<AlkemioErrorStatus, ErrorCodeEntry>          │
│                          72 entries                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ lookup
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ErrorCodeEntry                              │
│  ┌─────────────┬──────────────┬─────────────────┐                  │
│  │ numericCode │   category   │   userMessage   │                  │
│  │   number    │ ErrorCategory│     string      │                  │
│  └─────────────┴──────────────┴─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

| Field       | Rule                                 | Example                  |
| ----------- | ------------------------------------ | ------------------------ |
| numericCode | Must be 5 digits: 10000 ≤ x ≤ 99999  | 10101, 20104, 99999      |
| numericCode | First two digits must match category | 10 for NOT_FOUND         |
| numericCode | Must be unique across all entries    | No duplicates            |
| userMessage | May contain {{message}} placeholder  | "{{message}}"            |
| userMessage | May contain {{errorId}} placeholder  | "Reference: {{errorId}}" |

---

## Code Capacity by Category

| Category      | First 2 Digits | Capacity                                                     | Allocated  |
| ------------- | -------------- | ------------------------------------------------------------ | ---------- |
| NOT_FOUND     | 10             | 1,000                                                        | 10         |
| AUTHORIZATION | 20             | 1,000                                                        | 15         |
| VALIDATION    | 30             | 1,000                                                        | 14         |
| OPERATIONS    | 40             | 1,000                                                        | 12         |
| SYSTEM        | 50             | 1,000                                                        | 19         |
| FALLBACK      | 99             | 1,000                                                        | 1          |
| **Total**     | -              | **6,000** (used) / **90,000** (available with 90 categories) | **71 + 1** |

Note: First two digits = category (10-99). Last three digits = specific code (000-999).

---

## State Transitions

N/A - Error codes are immutable compile-time constants. No state transitions.

---

## Integration Points

### BaseException (Modified)

The `BaseException` class will call `getNumericCode()` during construction to populate the `numericCode` field in GraphQL extensions.

```typescript
// Before
extensions: {
  code: String(code),
  errorId,
  details,
}

// After
extensions: {
  code: String(code),
  numericCode: getNumericCode(code),  // NEW
  errorId,
  details,
}
```

### BaseHttpException (Modified)

Same pattern for HTTP exceptions to maintain consistency.

### GraphqlExceptionFilter (No Change)

The filter passes through extensions unchanged - no modifications needed.

### HttpExceptionFilter (No Change)

The filter passes through the response unchanged - no modifications needed.
