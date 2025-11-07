# GraphQL API Contract: Callouts Tag Cloud

**Feature**: 014-callouts-tag-cloud
**Schema Version**: Additive changes only (non-breaking)
**Date**: 2025-11-06

---

## Schema Extensions

### CalloutsSet Type Extension

```graphql
type CalloutsSet {
  # ... existing fields ...

  """
  All the tags of the Callouts and its contributions in this CalloutsSet.
  Sorted by frequency (descending), then alphabetically (ascending).

  This field aggregates tags from:
  - Callout framing profile tagsets
  - Post contribution profile tagsets

  Authorization: Only includes tags from Callouts the user has READ access to.

  Performance: Optimized for CalloutsSet with < 200 callouts.
  """
  tags(
    """
    Filter to include only tags from Callouts matching the specified classifications.

    Example: Only show tags from Callouts in "published" flowState:
      classificationTagsets: [{ name: "flowState", tags: ["published"] }]

    If omitted or empty, returns tags from all accessible Callouts.
    """
    classificationTagsets: [TagsetArgs!]
  ): [String!]!

  """
  The list of Callouts for this CalloutsSet object.
  """
  callouts(
    # ... existing args (IDs, withContributionTypes, limit, shuffle, sortByActivity, classificationTagsets) ...

    """
    Return only Callouts that have at least one of the specified tags
    either on their framing profile or in their contributions.

    Uses OR logic: Callout matches if ANY of the provided tags are present.

    Example: Filter for Callouts tagged with "AI" or "blockchain":
      withTags: ["AI", "blockchain"]

    Performance: Conditional query loading ensures tags are only fetched when this
    argument is provided, avoiding unnecessary data transfer.
    """
    withTags: [String!]
  ): [Callout!]!
}
```

---

## Input Types

### Existing Type (Reused)

```graphql
"""
Input for filtering by tagset name and tags.
Used across multiple features for classification-based filtering.
"""
input TagsetArgs {
  """
  The name of the tagset to filter by (e.g., "flowState", "group").
  Case-insensitive matching for classification tagsets.
  """
  name: String!

  """
  Optional array of tag values to match within the named tagset.
  If omitted or empty, matches any Callout that has the named tagset.
  """
  tags: [String!]
}
```

---

## Example Queries

### Query 1: Basic Tag Cloud

**Use Case**: Display all tags in knowledge base sorted by popularity

```graphql
query GetTagCloud($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id
      tags
    }
  }
}
```

**Example Response**:

```json
{
  "data": {
    "lookup": {
      "calloutsSet": {
        "id": "uuid-123",
        "tags": [
          "innovation", // Appears 15 times
          "sustainability", // Appears 12 times
          "AI", // Appears 10 times
          "blockchain", // Appears 8 times
          "collaboration" // Appears 5 times
        ]
      }
    }
  }
}
```

---

### Query 2: Filtered Tag Cloud (Published Content Only)

**Use Case**: Show tags only from published Callouts

```graphql
query GetPublishedTags($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id
      tags(classificationTagsets: [{ name: "flowState", tags: ["published"] }])
    }
  }
}
```

**Example Response**:

```json
{
  "data": {
    "lookup": {
      "calloutsSet": {
        "id": "uuid-123",
        "tags": ["innovation", "AI", "sustainability"]
      }
    }
  }
}
```

---

### Query 3: Filter Callouts by Tags

**Use Case**: Show only Callouts tagged with "AI" or "machine-learning"

```graphql
query GetAICallouts($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id
      callouts(withTags: ["AI", "machine-learning"]) {
        id
        nameID
        framing {
          profile {
            displayName
            tagsets {
              name
              tags
            }
          }
        }
      }
    }
  }
}
```

**Example Response**:

```json
{
  "data": {
    "lookup": {
      "calloutsSet": {
        "id": "uuid-123",
        "callouts": [
          {
            "id": "callout-1",
            "nameID": "ai-research",
            "framing": {
              "profile": {
                "displayName": "AI Research Topics",
                "tagsets": [
                  {
                    "name": "default",
                    "tags": ["AI", "research", "innovation"]
                  }
                ]
              }
            }
          },
          {
            "id": "callout-2",
            "nameID": "ml-applications",
            "framing": {
              "profile": {
                "displayName": "Machine Learning Applications",
                "tagsets": [
                  {
                    "name": "default",
                    "tags": ["machine-learning", "applications"]
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }
}
```

---

### Query 4: Combined Tag Cloud + Filtered Callouts

**Use Case**: Display tag cloud and matching Callouts simultaneously

```graphql
query TagCloudWithFilteredCallouts(
  $calloutsSetId: UUID!
  $selectedTags: [String!]!
) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id

      # Show all tags for tag cloud UI
      allTags: tags

      # Show only callouts matching selected tags
      filteredCallouts: callouts(withTags: $selectedTags) {
        id
        nameID
        framing {
          profile {
            displayName
          }
        }
      }
    }
  }
}
```

**Variables**:

```json
{
  "calloutsSetId": "uuid-123",
  "selectedTags": ["AI", "sustainability"]
}
```

**Example Response**:

```json
{
  "data": {
    "lookup": {
      "calloutsSet": {
        "id": "uuid-123",
        "allTags": [
          "innovation",
          "sustainability",
          "AI",
          "blockchain",
          "collaboration"
        ],
        "filteredCallouts": [
          {
            "id": "callout-1",
            "nameID": "ai-research",
            "framing": {
              "profile": {
                "displayName": "AI Research Topics"
              }
            }
          },
          {
            "id": "callout-3",
            "nameID": "sustainable-tech",
            "framing": {
              "profile": {
                "displayName": "Sustainable Technology"
              }
            }
          }
        ]
      }
    }
  }
}
```

---

### Query 5: Complex Filtering (Tags + Classification + Contribution Type)

**Use Case**: Show published Callouts about "AI" that accept posts

```graphql
query ComplexCalloutFilter($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id
      callouts(
        withTags: ["AI"]
        withContributionTypes: [POST]
        classificationTagsets: [{ name: "flowState", tags: ["published"] }]
      ) {
        id
        nameID
        settings {
          contribution {
            allowedTypes
          }
        }
        framing {
          profile {
            displayName
            tagsets {
              tags
            }
          }
        }
      }
    }
  }
}
```

---

## Error Responses

### Error 1: Unauthorized Access

**Scenario**: User lacks READ permission on CalloutsSet

```graphql
query GetTags($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      tags
    }
  }
}
```

**Response**:

```json
{
  "data": null,
  "errors": [
    {
      "message": "User does not have access to CalloutsSet: uuid-123",
      "extensions": {
        "code": "FORBIDDEN",
        "privilege": "READ"
      }
    }
  ]
}
```

---

### Error 2: CalloutsSet Not Found

**Scenario**: Invalid CalloutsSet ID

```graphql
query GetTags($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      tags
    }
  }
}
```

**Response**:

```json
{
  "data": null,
  "errors": [
    {
      "message": "CalloutsSet with id(invalid-uuid) not found!",
      "extensions": {
        "code": "ENTITY_NOT_FOUND"
      }
    }
  ]
}
```

---

## Performance Characteristics

| Query Type                          | Callouts | Expected Latency | Notes                                  |
| ----------------------------------- | -------- | ---------------- | -------------------------------------- |
| `tags` (no filter)                  | < 100    | < 500ms          | Single JOIN query                      |
| `tags` (no filter)                  | 100-200  | 1-2s             | In-memory aggregation overhead         |
| `tags` (with classification filter) | < 100    | < 800ms          | Additional WHERE clause                |
| `tags` (with classification filter) | 100-200  | 2-3s             | Filtering + aggregation                |
| `callouts` (with withTags)          | < 100    | < 500ms          | Conditional loading prevents waste     |
| `callouts` (with withTags)          | 100-200  | 1-2s             | Authorization + tag filtering overhead |

**Optimization**: Conditional query loading ensures tag relations are only fetched when `withTags` argument is present.

---

## Authorization Rules

### Field-Level Authorization

- **`CalloutsSet.tags`**: Requires `READ` privilege on CalloutsSet
- **`CalloutsSet.callouts`**: Requires `READ` privilege on CalloutsSet
- **Per-Callout Authorization**: Tags from inaccessible Callouts excluded from aggregation
- **Implicit Filtering**: Callouts user cannot READ are automatically filtered out

### Authorization Flow

```
1. User queries CalloutsSet.tags
2. @AuthorizationAgentPrivilege(READ) decorator validates access
3. Service loads CalloutsSet with Callouts
4. Per-Callout authorization check filters accessible Callouts
5. Tag extraction only from authorized Callouts
6. Aggregated tags returned
```

---

## Validation Rules

### Input Validation

1. **`classificationTagsets`**:
   - Array of `TagsetArgs` (validated by GraphQL type system)
   - `name` field required (String!)
   - `tags` field optional (can be empty or omitted)

2. **`withTags`**:
   - Array of strings (validated by GraphQL type system)
   - Can be empty array (treated as no filter)
   - No length restrictions (reasonable limits enforced by application logic)

### Business Logic Validation

1. **Empty Filters**: Treated as "no filter" (include all)
2. **Invalid Classification Names**: No callouts match (returns empty)
3. **Case Sensitivity**: Tag values are case-sensitive, classification names are case-insensitive

---

## Backward Compatibility

✅ **100% Backward Compatible**

- **Additive Changes Only**: New field and new argument added
- **Existing Queries Unaffected**: No modifications to existing fields or types
- **Optional Arguments**: All new arguments are optional with safe defaults
- **No Breaking Changes**: Schema contract validation passes

---

## Client Integration Guide

### React Hook Example (using Apollo Client)

```typescript
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_TAG_CLOUD = gql`
  query GetTagCloud($calloutsSetId: UUID!) {
    lookup {
      calloutsSet(ID: $calloutsSetId) {
        id
        tags
      }
    }
  }
`;

function TagCloud({ calloutsSetId }: { calloutsSetId: string }) {
  const { data, loading, error } = useQuery(GET_TAG_CLOUD, {
    variables: { calloutsSetId },
  });

  if (loading) return <div>Loading tags...</div>;
  if (error) return <div>Error loading tags</div>;

  const tags = data?.lookup?.calloutsSet?.tags ?? [];

  return (
    <div className="tag-cloud">
      {tags.map((tag, index) => (
        <TagBubble
          key={tag}
          tag={tag}
          size={calculateSize(index)} // Frequency-based sizing
        />
      ))}
    </div>
  );
}
```

---

## Testing Recommendations

### Integration Tests

1. **Tag Aggregation**:
   - Verify tags from framing and contributions included
   - Verify frequency sorting (primary) + alphabetical sorting (secondary)
   - Verify empty CalloutsSet returns `[]`

2. **Classification Filtering**:
   - Verify filter by flowState
   - Verify multiple classification tagsets
   - Verify empty filter includes all

3. **Tag-Based Callout Filtering**:
   - Verify OR logic (matches any provided tag)
   - Verify tags from framing matched
   - Verify tags from contributions matched
   - Verify authorization respected

4. **Performance**:
   - Verify conditional loading (tags not fetched when withTags absent)
   - Verify query time < 2s for 100 callouts
   - Verify no N+1 queries

---

## Schema Diff Impact

**Changes**:

- ✅ Added `CalloutsSet.tags` field (non-breaking)
- ✅ Added `CalloutsSet.callouts.withTags` argument (non-breaking)

**Schema Baseline**: Update `schema-baseline.graphql` after merge

**CI Gate**: Schema contract validation passes (additive changes only)

---

**Contract Status**: ✅ COMPLETE
**Schema Version**: Compatible with existing schema
**Next**: Quickstart guide for developers
