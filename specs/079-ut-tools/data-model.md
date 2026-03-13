# Unit Tests for src/tools -- Data Model

## Key interfaces

### ParsedDeprecationReason (deprecation-parser.ts)
```typescript
interface ParsedDeprecationReason {
  raw: string;
  removeAfter?: string;    // YYYY-MM-DD
  humanReason?: string;
  formatValid: boolean;
  warnings: string[];
  errors: string[];
}
```

### ReviewInput (override.ts)
```typescript
interface ReviewInput {
  reviewer: string;
  body: string;
  state?: string;  // APPROVED etc
}
```

### OverrideEvaluation (override.ts)
```typescript
interface OverrideEvaluation {
  applied: boolean;
  reviewer?: string;
  reason?: string;
  owners: string[];
  details: string[];
}
```

## No database entities

The `src/tools/` area contains only standalone CLI utilities and pure functions. There are no TypeORM entities, repositories, or NestJS modules. All data flows through function parameters and return values.
