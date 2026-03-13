# Data Model: Unit Tests for src/services/api-rest

## No data model changes

This specification covers test-only additions. No entities, migrations, or schema changes are involved.

## Key Interfaces Referenced in Tests

### CalendarEventIcsResult
```typescript
interface CalendarEventIcsResult {
  filename: string;
  content: string;
}
```

### IdentityResolveRequestDto
```typescript
class IdentityResolveRequestDto {
  authenticationId: string; // UUID v4
}
```

### IdentityResolveResponseDto
```typescript
class IdentityResolveResponseDto {
  userId: string;   // UUID v4
  actorID: string;  // UUID v4
}
```

### IdentityResolveRequestMeta
```typescript
interface IdentityResolveRequestMeta {
  ip?: string;
  userAgent?: string;
}
```

### IUser (relevant fields)
```typescript
interface IUser {
  id: string;
  authenticationID?: string;
  email?: string;
}
```
