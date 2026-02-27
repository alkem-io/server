# Data Model: 5-Digit Numeric Error Code System

**Date**: 2026-01-22
**Feature**: 032-error-codes

## Overview

This feature introduces compile-time data structures for mapping string-based error codes to 5-digit numeric codes. No database changes are required.

---

## TypeScript Interfaces

### ErrorCategory

Enumeration of error categories determined by the first two digits of the numeric code.

```typescript
export enum ErrorCategory {
  NOT_FOUND = 10, // 10xxx - Entity/resource not found
  AUTHORIZATION = 11, // 11xxx - Auth/permission errors
  VALIDATION = 12, // 12xxx - Input/state validation
  OPERATIONS = 13, // 13xxx - Business rule violations
  SYSTEM = 14, // 14xxx - Infrastructure errors
  FALLBACK = 99, // 99xxx - Unmapped errors
}
```

### ErrorMetadata

Complete metadata for a single error code mapping.

```typescript
export interface ErrorMetadata {
  /** Category prefix (10 - 99) */
  category: ErrorCategory;

  /** Specific code within category (100 - 999) */
  specificCode: number;

  /** i18n translation key for user-friendly message */
  userMessage: string;
}
```

### STATUS_METADATA

The complete mapping from string codes to numeric codes.

```typescript
const STATUS_METADATA: Record<AlkemioErrorStatus, ErrorMetadata>;
```

---

## Data Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AlkemioErrorStatus                           │
│                    (existing enum - unchanged)                      │
│                        71 string values                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ 1:1 mapping
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         STATUS_METADATA                             │
│                    Record<AlkemioErrorStatus, ErrorMetadata>        │
│                          71 entries                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ lookup
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ErrorMetadata                               │
│  ┌──────────────┬──────────────┬─────────────────┐                 │
│  │   category   │ specificCode │   userMessage   │                 │
│  │ ErrorCategory│    number    │  string (i18n)  │                 │
│  └──────────────┴──────────────┴─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

| Field        | Rule                                       | Example                      |
| ------------ | ------------------------------------------ | ---------------------------- |
| category     | Must be valid ErrorCategory enum value     | 10, 11, 12, 13, 14, 99       |
| specificCode | Must be 100-999                            | 101, 102, 999                |
| numericCode  | Computed: category * 1000 + specificCode   | 10101, 11104, 99999          |
| numericCode  | Must be unique across all entries          | No duplicates                |
| userMessage  | Must be i18n key (no dynamic data)         | "userMessages.notFound.entity"|

---

## Code Capacity by Category

| Category      | First 2 Digits | Capacity | Allocated |
| ------------- | -------------- | -------- | --------- |
| NOT_FOUND     | 10             | 1,000    | 10        |
| AUTHORIZATION | 11             | 1,000    | 16        |
| VALIDATION    | 12             | 1,000    | 13        |
| OPERATIONS    | 13             | 1,000    | 13        |
| SYSTEM        | 14             | 1,000    | 18        |
| FALLBACK      | 99             | 1,000    | 1         |
| **Total**     | -              | 6,000    | **71**    |

Note: First two digits = category (10-14, 99). Last three digits = specific code (100-999).

---

## State Transitions

N/A - Error codes are immutable compile-time constants. No state transitions.

---

## Integration Points

### BaseException (Modified)

The `BaseException` class will call `getMetadataForStatus()` and `computeNumericCode()` during construction to populate the `numericCode` and `userMessage` fields in GraphQL extensions.

```typescript
// Before
extensions: {
  code: String(code),
  errorId,
  details,
}

// After
const metadata = getMetadataForStatus(code);
const numericCode = computeNumericCode(metadata);
extensions: {
  code: String(code),
  numericCode,                   // NEW
  userMessage: metadata.userMessage,  // NEW - i18n key
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
