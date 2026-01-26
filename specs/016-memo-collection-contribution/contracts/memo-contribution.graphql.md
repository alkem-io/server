# GraphQL API Contracts: Memo Collection Contributions

**Feature**: 016-memo-collection-contribution
**Date**: 2025-11-06

## Mutations

### createContributionOnCallout (Existing - Extended)

**Description**: Create a new contribution on a callout, including memo type

**Signature**:

```graphql
mutation CreateContributionOnCallout(
  $contributionData: CreateContributionOnCalloutInput!
) {
  createContributionOnCallout(contributionData: $contributionData) {
    id
    type
    sortOrder
    createdBy
    memo {
      id
      nameID
      createdBy {
        id
        email
        profile {
          displayName
        }
      }
      profile {
        id
        displayName
        description
      }
      markdown
      updatedDate
      isMultiUser
    }
  }
}
```

**Input Type** (Existing):

```graphql
input CreateContributionOnCalloutInput {
  calloutID: UUID!
  type: CalloutContributionType!
  sortOrder: Float
  # ONE of the following based on type:
  post: CreatePostInput
  whiteboard: CreateWhiteboardInput
  link: CreateLinkInput
  memo: CreateMemoInput # ← ENABLE THIS OPTION
}

input CreateMemoInput {
  nameID: NameID
  profileData: CreateProfileInput!
  markdown: Markdown # Initial content in markdown format
  contentUpdatePolicy: ContentUpdatePolicy
}

enum CalloutContributionType {
  POST
  WHITEBOARD
  LINK
  MEMO # ← ALREADY EXISTS IN SCHEMA
}

enum ContentUpdatePolicy {
  ADMINS
  OWNER
  CONTRIBUTORS
}
```

**Example Request**:

```json
{
  "contributionData": {
    "calloutID": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
    "type": "MEMO",
    "sortOrder": 0,
    "memo": {
      "profileData": {
        "displayName": "Product Requirements Document",
        "description": "Initial draft of PRD for Q1 2025"
      },
      "markdown": "# Product Requirements\n\n## Overview\nThis document outlines...",
      "contentUpdatePolicy": "CONTRIBUTORS"
    }
  }
}
```

**Success Response**:

```json
{
  "data": {
    "createContributionOnCallout": {
      "id": "contrib-uuid-1234",
      "type": "MEMO",
      "sortOrder": 0,
      "createdBy": "user-uuid-5678",
      "memo": {
        "id": "memo-uuid-9012",
        "nameID": "product-requirements-document",
        "createdBy": {
          "id": "user-uuid-5678",
          "email": "user@example.com",
          "profile": {
            "displayName": "John Doe"
          }
        },
        "profile": {
          "id": "profile-uuid-3456",
          "displayName": "Product Requirements Document",
          "description": "Initial draft of PRD for Q1 2025"
        },
        "markdown": "# Product Requirements\n\n## Overview\nThis document outlines...",
        "updatedDate": "2025-11-06T10:30:00.000Z",
        "isMultiUser": true
      }
    }
  }
}
```

**Error Cases**:

1. **Type not allowed**:

```json
{
  "errors": [
    {
      "message": "Attempted to create a contribution of type 'memo', which is not in the allowed types: [post, link]",
      "extensions": {
        "code": "VALIDATION_ERROR"
      }
    }
  ]
}
```

2. **Missing memo data**:

```json
{
  "errors": [
    {
      "message": "CalloutContribution type is \"memo\" but no memo data was provided",
      "extensions": {
        "code": "VALIDATION_ERROR"
      }
    }
  ]
}
```

3. **Conflicting type data**:

```json
{
  "errors": [
    {
      "message": "CalloutContribution declared as 'memo' but also contains data for: [post]",
      "extensions": {
        "code": "VALIDATION_ERROR"
      }
    }
  ]
}
```

---

## Queries

### callout.contributions (Existing - Extended)

**Description**: Query contributions from a callout, including filtering by memo type

**Signature**:

```graphql
query GetCalloutContributions(
  $calloutID: UUID!
  $filter: ContributionsFilterInput
) {
  lookup {
    callout(ID: $calloutID) {
      id
      nameID
      contributions(filter: $filter) {
        id
        type
        sortOrder
        createdBy
        # Resolved based on type:
        memo {
          id
          nameID
          createdBy {
            id
            profile {
              displayName
            }
          }
          profile {
            displayName
            description
          }
          markdown
          updatedDate
        }
        post {
          id
          nameID
          # ... post fields
        }
        whiteboard {
          id
          nameID
          # ... whiteboard fields
        }
      }
    }
  }
}
```

**Filter Input** (Existing):

```graphql
input ContributionsFilterInput {
  IDs: [UUID!] # Specific contribution IDs
  types: [CalloutContributionType!] # Filter by type(s)
}
```

**Example Request** (All contributions):

```json
{
  "calloutID": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
  "filter": null
}
```

**Example Request** (Memos only):

```json
{
  "calloutID": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
  "filter": {
    "types": ["MEMO"]
  }
}
```

**Success Response**:

```json
{
  "data": {
    "lookup": {
      "callout": {
        "id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
        "nameID": "collaboration-space",
        "contributions": [
          {
            "id": "contrib-1",
            "type": "MEMO",
            "sortOrder": 0,
            "createdBy": "user-1",
            "memo": {
              "id": "memo-1",
              "nameID": "product-requirements",
              "createdBy": {
                "id": "user-1",
                "profile": { "displayName": "Alice" }
              },
              "profile": {
                "displayName": "Product Requirements",
                "description": "Q1 2025 PRD"
              },
              "markdown": "# Product Requirements\n...",
              "updatedDate": "2025-11-06T10:00:00.000Z"
            },
            "post": null,
            "whiteboard": null
          }
        ]
      }
    }
  }
}
```

---

### callout.contributionsCount (Existing - Extended)

**Description**: Get count of contributions by type, including memos

**Signature**:

```graphql
query GetContributionCounts($calloutID: UUID!) {
  lookup {
    callout(ID: $calloutID) {
      id
      contributionsCount {
        post
        link
        whiteboard
        memo # ← ALREADY EXISTS IN SCHEMA
      }
    }
  }
}
```

**Example Request**:

```json
{
  "calloutID": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789"
}
```

**Success Response**:

```json
{
  "data": {
    "lookup": {
      "callout": {
        "id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
        "contributionsCount": {
          "post": 5,
          "link": 3,
          "whiteboard": 2,
          "memo": 4
        }
      }
    }
  }
}
```

---

### callout.settings.contribution (Existing - No Changes)

**Description**: Query allowed contribution types for a callout

**Signature**:

```graphql
query GetCalloutSettings($calloutID: UUID!) {
  lookup {
    callout(ID: $calloutID) {
      id
      settings {
        contribution {
          enabled
          allowedTypes # Can include MEMO
          canAddContributions
        }
      }
    }
  }
}
```

**Example Response** (Memo enabled):

```json
{
  "data": {
    "lookup": {
      "callout": {
        "id": "a1b2c3d4-e5f6-4789-a0b1-c2d3e4f56789",
        "settings": {
          "contribution": {
            "enabled": true,
            "allowedTypes": ["POST", "WHITEBOARD", "MEMO"],
            "canAddContributions": "SPACE_MEMBERS"
          }
        }
      }
    }
  }
}
```

---

## Type Definitions

### CalloutContribution (Extended)

```graphql
type CalloutContribution {
  id: UUID!
  createdDate: DateTime!
  updatedDate: DateTime!
  type: CalloutContributionType!
  createdBy: String
  sortOrder: Float!

  # ONE of these will be non-null based on type:
  post: Post
  link: Link
  whiteboard: Whiteboard
  memo: Memo # ← ADD RESOLVER FIELD
}
```

### Memo (Existing - No Changes)

```graphql
type Memo {
  id: UUID!
  nameID: NameID!
  createdDate: DateTime!
  updatedDate: DateTime!

  createdBy: User # Resolver field
  profile: Profile! # Resolver field
  content: String # Base64 Yjs binary state (resolver field)
  markdown: Markdown # Converted markdown (resolver field)
  contentUpdatePolicy: ContentUpdatePolicy!
  isMultiUser: Boolean! # Resolver field based on license
}
```

---

## Authorization

### Required Privileges

**Creating Memo Contribution**:

```
User must have:
1. CREATE privilege on Callout (checked first)
2. Be in allowed contributors based on callout.settings.contribution.canAddContributions
   - SPACE_MEMBERS: Any space member
   - SPACE_ADMINS: Only space admins
   - etc.
```

**Querying Memo Contributions**:

```
User must have:
1. READ privilege on Callout (inherited from Space)
2. READ privilege on each CalloutContribution (inherited from Callout)
3. READ privilege on each Memo (inherited from Contribution)
```

**Updating Memo Content**:

```
User must have:
1. UPDATE privilege on Memo based on contentUpdatePolicy:
   - ADMINS: User is space admin
   - OWNER: User is memo.createdBy
   - CONTRIBUTORS: User is space member
```

---

## Performance Characteristics

### Query Complexity

**Single contribution query**:

- Depth: 4 levels (callout → contribution → memo → profile/user)
- Cost: ~3-5 DB queries (with DataLoader optimization)
- Target: <50ms

**List contributions query** (100 items):

- Depth: 4 levels
- Cost: ~5-7 DB queries (N+1 prevented by DataLoader)
- Target: <200ms

**Contribution count query**:

- Depth: 2 levels
- Cost: 1 DB query (GROUP BY aggregation)
- Target: <20ms

### Caching Strategy

- **Contribution entities**: Cache-aside pattern, 5 minute TTL
- **Memo content**: Not cached (too large, frequently edited)
- **User/Profile lookups**: DataLoader caches within request scope
- **Authorization decisions**: Cached per request in AgentInfo

---

## Schema Changes Required

**Summary**: NONE

**Rationale**:

- `CalloutContributionType.MEMO` enum value already exists
- `CreateCalloutContributionInput.memo` field already exists
- `CalloutContribution.memo` field implicitly exists via entity relationship
- `CalloutContributionsCountOutput.memo` field already exists

**Implementation Scope**: Only need to add resolver field for `memo` on `CalloutContribution` type

---

## Backward Compatibility

**API Compatibility**: 100% backward compatible

- Old clients: Ignore `memo` field in responses
- New clients: Can query `memo` field when present
- No deprecations required
- No versioning required

**Query Compatibility**:

- Existing queries continue to work without modifications
- Fragment spreads on `CalloutContribution` automatically include `memo` if queried
- Type filters including `MEMO` work immediately after server deployment

---

## Testing Examples

### Integration Test Scenarios

**Test 1: Create memo contribution**

```graphql
mutation {
  createContributionOnCallout(
    contributionData: {
      calloutID: "test-callout-id"
      type: MEMO
      memo: {
        profileData: { displayName: "Test Memo" }
        markdown: "# Test Content"
        contentUpdatePolicy: CONTRIBUTORS
      }
    }
  ) {
    id
    type
    memo {
      id
      nameID
    }
  }
}
# Expected: SUCCESS, returns memo contribution
```

**Test 2: Query memo contributions**

```graphql
query {
  lookup {
    callout(ID: "test-callout-id") {
      contributions(filter: { types: [MEMO] }) {
        id
        type
        memo {
          id
          profile {
            displayName
          }
        }
      }
    }
  }
}
# Expected: Returns only MEMO type contributions
```

**Test 3: Count includes memos**

```graphql
query {
  lookup {
    callout(ID: "test-callout-id") {
      contributionsCount {
        post
        whiteboard
        link
        memo
      }
    }
  }
}
# Expected: memo count reflects actual contributions
```

**Test 4: Type validation**

```graphql
mutation {
  createContributionOnCallout(
    contributionData: {
      calloutID: "test-callout-id-no-memo"
      type: MEMO
      memo: { profileData: { displayName: "Test" } }
    }
  ) {
    id
  }
}
# Expected: ERROR if MEMO not in callout allowedTypes
```

---

## Summary

All GraphQL contracts already exist in the schema. Implementation requires only:

1. Adding resolver field for `CalloutContribution.memo`
2. Ensuring `CalloutContributionService.getMemo()` method exists
3. Wiring memo creation logic in `createCalloutContribution()` service method

Zero breaking changes, full backward compatibility, immediate client support after deployment.
