# Data Model: Enable Memo as Valid Collection Contribution Type

**Feature**: 016-memo-collection-contribution
**Date**: 2025-11-06
**Status**: Complete

## Overview

This document describes the data entities, relationships, and state flows for enabling memo contributions in collection callouts. The model leverages existing entities with minimal changes to service orchestration logic.

## Entity Diagram

```
CalloutContribution (Aggregate Root)
├── id: UUID (PK)
├── type: CalloutContributionType (ENUM: POST, WHITEBOARD, LINK, MEMO)
├── createdBy: UUID (FK → User)
├── sortOrder: number
├── authorization: AuthorizationPolicy (1:1, cascade)
├── callout: Callout (N:1)
├── post: Post (1:1, cascade, nullable)
├── whiteboard: Whiteboard (1:1, cascade, nullable)
├── link: Link (1:1, cascade, nullable)
└── memo: Memo (1:1, cascade, nullable) ← ENABLES THIS RELATIONSHIP

Memo (Existing Entity)
├── id: UUID (PK)
├── nameID: string (unique within context)
├── content: Buffer (mediumblob, Yjs binary state)
├── createdBy: UUID (FK → User)
├── contentUpdatePolicy: ContentUpdatePolicy (ENUM)
├── authorization: AuthorizationPolicy (1:1, cascade)
├── profile: Profile (1:1, cascade)
├── framing: CalloutFraming (1:1, optional)
└── contribution: CalloutContribution (1:1, optional) ← INVERSE RELATIONSHIP
```

## Key Entities

### CalloutContribution (Existing - Modified)

**Purpose**: Aggregate root for all contribution types in a collection callout

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| type | CalloutContributionType | ENUM, NOT NULL, DEFAULT 'post' | Contribution discriminator |
| createdBy | UUID | FK → user.id, NULLABLE | User who created contribution |
| sortOrder | Float | NOT NULL, DEFAULT 0 | Display ordering |
| authorizationId | UUID | FK → authorization_policy.id | Access control |
| calloutId | UUID | FK → callout.id, NOT NULL | Parent callout |
| postId | UUID | FK → post.id, NULLABLE | Post contribution (1:1) |
| whiteboardId | UUID | FK → whiteboard.id, NULLABLE | Whiteboard contribution (1:1) |
| linkId | UUID | FK → link.id, NULLABLE | Link contribution (1:1) |
| memoId | UUID | FK → memo.id, NULLABLE | **Memo contribution (1:1) - ENABLE THIS** |
| createdDate | DateTime | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedDate | DateTime | NOT NULL, DEFAULT NOW(), ON UPDATE | Last update timestamp |

**Relationships**:

- **memo** (1:1): OneToOne with Memo entity, cascade=true, onDelete=SET NULL, eager=false

**Invariants**:

1. Exactly ONE of (post, whiteboard, link, memo) must be non-null
2. `type` field must match the non-null relationship field
3. `createdBy` must reference valid user
4. `authorization` must exist
5. `sortOrder` must be non-negative

**State Transitions**: N/A (immutable after creation except sortOrder)

---

### Memo (Existing - No Changes Required)

**Purpose**: Collaborative document entity using Yjs CRDT for real-time editing

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, NOT NULL | Unique identifier |
| nameID | VARCHAR(36) | NOT NULL, UNIQUE within context | URL-safe identifier |
| content | MEDIUMBLOB | NULLABLE | Yjs binary state v2 |
| createdBy | UUID | FK → user.id, NULLABLE | Creator user |
| contentUpdatePolicy | ContentUpdatePolicy | ENUM('ADMINS', 'OWNER', 'CONTRIBUTORS'), NOT NULL | Who can edit |
| authorizationId | UUID | FK → authorization_policy.id | Access control |
| profileId | UUID | FK → profile.id, NOT NULL | Display metadata |
| createdDate | DateTime | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updatedDate | DateTime | NOT NULL, DEFAULT NOW(), ON UPDATE | Last update timestamp |

**Relationships**:

- **profile** (1:1): Contains displayName (title), description, tagsets, references, visuals
- **authorization** (1:1): Authorization policy for memo access
- **framing** (1:1, optional): Inverse relationship to CalloutFraming (for memo-based callouts)
- **contribution** (1:1, optional): Inverse relationship to CalloutContribution (for memo contributions)

**Invariants**:

1. `profile` must exist
2. `authorization` must exist
3. `nameID` must be unique within parent context (callout scope)
4. Cannot have both `framing` and `contribution` relationships
5. `contentUpdatePolicy` determines edit permissions

**Derived Properties**:

- `markdown`: Converts binary content to markdown string (resolver field)
- `isMultiUser`: Checks if multi-user editing is enabled (resolver field based on license)

---

### CalloutSettingsContribution (Existing - No Changes Required)

**Purpose**: Configuration object defining allowed contribution types for a callout

**Attributes**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| enabled | Boolean | NOT NULL | Whether contributions are enabled |
| allowedTypes | CalloutContributionType[] | ARRAY, NOT NULL | Allowed contribution types |
| canAddContributions | CalloutAllowedContributors | ENUM, NOT NULL | Who can add contributions |
| commentsEnabled | Boolean | NOT NULL | Whether comments are enabled |

**Validation Rules**:

1. If `enabled=false`, contribution creation is blocked regardless of `allowedTypes`
2. `allowedTypes` array can contain MEMO value
3. Contribution creation validates that `type` is in `allowedTypes`

---

### CalloutContributionsCountOutput (Existing - No Changes Required)

**Purpose**: GraphQL output type for contribution statistics

**Attributes**:
| Field | Type | Description |
|-------|------|-------------|
| post | Int | Count of post contributions |
| link | Int | Count of link contributions |
| whiteboard | Int | Count of whiteboard contributions |
| memo | Int | Count of memo contributions |

**Calculation**: Counts contributions grouped by `type` field

---

## Data Flow Diagrams

### Memo Contribution Creation Flow

```
User → GraphQL Mutation: createContributionOnCallout
  ↓
CalloutResolverMutations.createContributionOnCallout()
  ↓ (authorize CREATE on callout)
  ↓
CalloutService.createContributionOnCallout()
  ↓ (load callout, validate settings, reserve nameID)
  ↓
CalloutContributionService.createCalloutContribution()
  ↓ (validate contribution type in allowedTypes)
  ↓ (create contribution entity)
  ↓
[IF memo field present]
  ↓
MemoService.createMemo()
  ↓ (create profile, authorization, memo entity)
  ↓ (return IMemo)
  ↓
contribution.memo = memo ← ASSIGN RELATIONSHIP
  ↓
[Save contribution to DB]
  ↓
CalloutService.processActivityMemoCreated() ← NEW METHOD
  ↓
ContributionReporterService.memoContribution()
  ↓ (index in Elasticsearch for activity feed)
  ↓
[Return contribution]
  ↓
GraphQL Response → User
```

### Memo Contribution Query Flow

```
User → GraphQL Query: callout { contributions { memo { ... } } }
  ↓
CalloutResolverFields.contributions()
  ↓ (load contributions with type filter if specified)
  ↓
[For each contribution with type=MEMO]
  ↓
CalloutContributionResolverFields.memo()
  ↓ (resolve memo field)
  ↓
CalloutContributionService.getMemo() ← NEW METHOD
  ↓ (load contribution with memo relation)
  ↓
[Return IMemo | null]
  ↓
MemoResolverFields.* (resolver fields for memo metadata)
  ↓ (profile, createdBy, content, markdown, isMultiUser)
  ↓
GraphQL Response → User
```

### Contribution Counting Flow

```
CalloutResolverFields.contributionsCount()
  ↓
CalloutService.getContributionsCount()
  ↓
[SQL GROUP BY contribution.type]
  ↓
[COUNT for each type including MEMO]
  ↓
{
  post: X,
  link: Y,
  whiteboard: Z,
  memo: W  ← ALREADY COUNTED (no code change needed)
}
```

## Validation Rules

### Contribution Type Validation

```typescript
// In CalloutContributionService.validateContributionType()

1. Check: type IN allowedTypes
   - Violation: ValidationException
   - Message: "Attempted to create contribution of type 'X', which is not in allowed types: [...]"

2. Check: Exactly one of (post, whiteboard, link, memo) is non-null
   - Violation: ValidationException
   - Message: "CalloutContribution type is 'memo' but no memo data was provided"

3. Check: No conflicting type data present
   - Violation: ValidationException
   - Message: "CalloutContribution declared as 'memo' but also contains data for: [list]"
```

### Memo Creation Validation

```typescript
// In MemoService.createMemo()

1. Check: nameID is unique within callout scope
   - Handled by: NamingService.getReservedNameIDsInCalloutContributions()
   - Violation: ValidationException

2. Check: markdown or content provided (at least one)
   - Violation: ValidationException (from Memo entity validation)

3. Check: storageAggregator valid for profile documents
   - Violation: EntityNotInitializedException

4. Check: userID references valid user
   - Violation: Implicit (database foreign key constraint)
```

### Authorization Rules

```typescript
// Authorization checks cascade:

1. Callout-level: AgentInfo must have CREATE privilege on Callout
2. Contribution-level: Inherits from Callout + user must be in allowed contributors
3. Memo-level: CreatedBy user gets OWNER role, inherits Space community roles
```

## State Management

### CalloutContribution States

**States**: Contributions are essentially immutable after creation (no workflow states)

**Mutable Fields**:

- `sortOrder`: Can be updated for reordering
- `authorization`: Can be modified by authorization policy updates

**Immutable Fields**:

- `type`, `createdBy`, `calloutId`, relationship fields (post/whiteboard/link/memo)

### Memo States

**States**: Memos have no explicit state machine; managed by `contentUpdatePolicy`

**Content Update Policies**:

- `ADMINS`: Only space admins can edit
- `OWNER`: Only creator can edit
- `CONTRIBUTORS`: All space members can edit

**State Transitions**: Policy can change via `updateMemo` mutation

## Performance Considerations

### Query Optimization

**N+1 Query Prevention**:

- Use DataLoader for User lookup (createdBy field)
- Use DataLoader for Profile lookup (memo.profile)
- Lazy load memo relationship (eager: false)

**Indexing**:

- Index on `callout.contributions.type` for filtered queries
- Index on `callout.contributions.sortOrder` for ordering
- Index on `memo.nameID` for URL resolution

**Query Limits**:

- Default page size: 20 contributions
- Max page size: 100 contributions
- Target response time: <200ms for page of 100

### Write Optimization

**Transaction Boundaries**:

- Memo creation is transactional (profile + authorization + memo)
- Contribution creation is transactional (contribution + child entity)
- ElasticSearch indexing is async (fire-and-forget)

## Migration Notes

**Database Changes Required**: NONE

**Rationale**:

- `memo` relationship field already exists in CalloutContribution entity
- `memoId` column already exists in `callout_contribution` table
- Migration `CleanUpContributions1758116200183` confirms memo support
- No schema changes needed

**Backward Compatibility**:

- 100% compatible - only enabling existing schema definitions
- Existing queries continue to work
- New clients can query memo field, old clients ignore it

## Testing Data Requirements

### Mock Data Structures

```typescript
// Memo contribution mock
const mockMemoContribution = {
  id: uuid(),
  type: CalloutContributionType.MEMO,
  createdBy: 'user-123',
  sortOrder: 0,
  memo: {
    id: uuid(),
    nameID: 'memo-test-1',
    createdBy: 'user-123',
    contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
    content: Buffer.from('...yjs binary...'),
    profile: {
      displayName: 'Test Memo',
      description: 'A test memo contribution',
    },
  },
};
```

### Test Scenarios

1. **Valid creation**: Callout allows MEMO → contribution created successfully
2. **Invalid type**: Callout allows [POST, WHITEBOARD] → MEMO rejected
3. **Missing data**: type=MEMO but no memo field → validation error
4. **Conflicting data**: type=MEMO but also has post field → validation error
5. **Query filtering**: Filter by type=MEMO returns only memo contributions
6. **Counting**: Contribution count includes memo contributions accurately

## Summary

The data model requires **zero schema changes**. All entity relationships, fields, and constraints already exist. Implementation focuses on enabling the dormant memo contribution path in service orchestration and resolver layers. The design follows established patterns for post/whiteboard/link contributions, ensuring consistency and maintainability.
