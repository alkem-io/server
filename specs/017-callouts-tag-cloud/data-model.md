# Data Model: Callouts Tag Cloud

**Feature**: 017-callouts-tag-cloud
**Date**: 2025-11-06
**Status**: Retroactive documentation

## Overview

This feature extends the existing CalloutsSet entity with computed tag aggregation capabilities. **No database schema changes** are required - the feature leverages existing tagset infrastructure on Callout and Contribution entities.

---

## Entity Relationships

```
CalloutsSet (no DB changes)
├── Callouts[] (existing)
│   ├── Framing (existing)
│   │   └── Profile (existing)
│   │       └── Tagsets[] (existing) ← SOURCE 1 for tags
│   ├── Classification (existing)
│   │   └── Tagsets[] (existing) ← FILTER by classification
│   └── Contributions[] (existing)
│       └── Post (existing)
│           └── Profile (existing)
│               └── Tagsets[] (existing) ← SOURCE 2 for tags
```

**Key**: Existing structure is leveraged; no new entities or relations added.

---

## Modified Entities

### CalloutsSet (Interface Extension Only)

**TypeScript Interface Extension**:

```typescript
interface ICalloutsSet {
  // ... existing fields ...

  // NEW COMPUTED FIELD (not persisted)
  tags?: string[]; // Computed in resolver, not stored in DB
}
```

**GraphQL Schema Extension**:

```graphql
type CalloutsSet {
  # ... existing fields ...

  tags(classificationTagsets: [TagsetArgs!]): [String!]!
}
```

**No Database Migration Required**: The `tags` field is computed on-demand from related entities.

---

## Data Sources for Tag Aggregation

### Source 1: Callout Framing Profile Tagsets

**Path**: `CalloutsSet → Callouts[] → Framing → Profile → Tagsets[] → tags[]`

**Example Data**:

```json
{
  "callout": {
    "id": "callout-1",
    "framing": {
      "profile": {
        "tagsets": [
          {
            "name": "default",
            "tags": ["AI", "machine-learning", "innovation"]
          }
        ]
      }
    }
  }
}
```

**Contribution to Aggregation**: All tags from all tagsets in callout framing profiles.

---

### Source 2: Post Contribution Profile Tagsets

**Path**: `CalloutsSet → Callouts[] → Contributions[] → Post → Profile → Tagsets[] → tags[]`

**Example Data**:

```json
{
  "callout": {
    "id": "callout-1",
    "contributions": [
      {
        "post": {
          "profile": {
            "tagsets": [
              {
                "name": "default",
                "tags": ["blockchain", "sustainability"]
              }
            ]
          }
        }
      }
    ]
  }
}
```

**Contribution to Aggregation**: All tags from all tagsets in post contribution profiles.

**Note**: Whiteboard and Link contributions currently do not have tags (see Out of Scope in spec).

---

### Filter Source: Classification Tagsets

**Path**: `CalloutsSet → Callouts[] → Classification → Tagsets[]`

**Purpose**: Filter which callouts contribute to tag aggregation based on classification (e.g., flowState, group).

**Example Data**:

```json
{
  "callout": {
    "id": "callout-1",
    "classification": {
      "tagsets": [
        {
          "name": "flowState",
          "tags": ["published"]
        }
      ]
    }
  }
}
```

**Usage**: When `classificationTagsets` filter is provided, only callouts matching the classification contribute their tags.

---

## Data Flow Diagrams

### Flow 1: Tag Aggregation (getAllTags)

```
┌─────────────┐
│ GraphQL     │
│ Query:      │
│ tags(...)   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ CalloutsSetResolverFields.tags()         │
│ - Receives: calloutsSet, args            │
│ - Calls: getAllTags(calloutsSetID, ...) │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ CalloutsSetService.getAllTags()                  │
│ 1. Load CalloutsSet with relations:              │
│    - callouts.framing.profile.tagsets            │
│    - callouts.classification.tagsets             │
│    - callouts.contributions.post.profile.tagsets │
│ 2. Filter callouts by classificationTagsets      │
│ 3. Extract tags via getCalloutTags()             │
│ 4. Count frequency, sort                         │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Result: string[]            │
│ ["innovation", "AI", ...]   │
│ (sorted by frequency+alpha) │
└─────────────────────────────┘
```

### Flow 2: Callout Filtering by Tags (withTags)

```
┌─────────────────┐
│ GraphQL         │
│ Query:          │
│ callouts(       │
│   withTags: ... │
│ )               │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ CalloutsSetResolverFields.callouts()     │
│ - Receives: calloutsSet, args, agentInfo│
│ - Calls: getCalloutsFromCollaboration() │
└──────────────┬───────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────┐
│ CalloutsSetService.getCalloutsFromCollaboration() │
│ 1. Conditional loading (only if withTags present):│
│    - callouts.framing.profile.tagsets             │
│    - callouts.contributions.post.profile.tagsets  │
│ 2. Filter callouts:                               │
│    a. Authorization check (READ privilege)        │
│    b. Contribution type filter (if provided)      │
│    c. Tag filter (if withTags provided)           │
│    d. Classification filter (if provided)         │
│ 3. Return filtered list                           │
└──────────────┬─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Result: ICallout[]          │
│ (filtered by tags + auth)   │
└─────────────────────────────┘
```

---

## Validation Rules

### Input Validation (GraphQL Layer)

**CalloutsSetArgsTags** (for `tags` field):

```typescript
@ArgsType()
export class CalloutsSetArgsTags {
  @Field(() => [TagsetArgs], { nullable: true })
  classificationTagsets?: TagsetArgs[];
}
```

**CalloutsSetArgsCallouts** (enhanced for `callouts` field):

```typescript
@ArgsType()
export class CalloutsSetArgsCallouts {
  // ... existing fields ...

  @Field(() => [String], { nullable: true })
  withTags?: string[];
}
```

**TagsetArgs** (reused existing type):

```typescript
@ArgsType()
export class TagsetArgs {
  @Field(() => String!)
  name!: string;

  @Field(() => [String!], { nullable: true })
  tags?: string[];
}
```

### Business Logic Validation (Service Layer)

1. **Empty CalloutsSet**: Returns `[]` (empty array)
2. **Null/Undefined Tagsets**: Handled via optional chaining (`tagset?.tags ?? []`)
3. **Empty Classification Filter**: Treated as "no filter" (include all callouts)
4. **Invalid Classification Name**: No callouts match (returns empty)
5. **Authorization**: Only tags from authorized callouts included

---

## Aggregation Algorithm

### Frequency Counting

```typescript
const tagFrequency: { [key: string]: number } = {};
for (const tag of allTags) {
  tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
}
```

**Example**:

```json
// Input: ["AI", "blockchain", "AI", "AI", "sustainability", "blockchain"]
// Output: { "AI": 3, "blockchain": 2, "sustainability": 1 }
```

### Dual Sorting

```typescript
return Object.keys(tagFrequency).sort((a, b) => {
  // Primary: frequency (descending)
  if (tagFrequency[b] === tagFrequency[a]) {
    // Secondary: alphabetical (ascending)
    return a.localeCompare(b);
  }
  return tagFrequency[b] - tagFrequency[a];
});
```

**Example**:

```json
// Input: { "AI": 3, "blockchain": 2, "sustainability": 1, "apple": 2 }
// Output: ["AI", "apple", "blockchain", "sustainability"]
//          ^freq:3  ^freq:2(alpha)  ^freq:2(alpha)  ^freq:1
```

---

## Performance Considerations

### Query Optimization

**Conditional Loading** (avoids loading when not needed):

```typescript
const queryTags: boolean = !!args.withTags?.length;

relations: {
  callouts: {
    classification: { tagsets: true },  // Always load
    ...(queryTags && {  // Only load if filtering by tags
      framing: { profile: { tagsets: true } },
      contributions: { post: { profile: { tagsets: true } } }
    })
  }
}
```

**Impact**: Saves ~100-200 tagset records from being loaded when not needed.

### Memory Footprint

| Callouts | Avg Tags | Unique Tags | Memory Usage |
| -------- | -------- | ----------- | ------------ |
| 10       | 50       | 20          | ~2KB         |
| 50       | 250      | 100         | ~10KB        |
| 100      | 500      | 300         | ~30KB        |
| 200      | 1000     | 800         | ~80KB        |

**Conclusion**: In-memory aggregation is acceptable for expected scale.

---

## Edge Cases & Handling

| Edge Case                               | Handling                   | Example                                |
| --------------------------------------- | -------------------------- | -------------------------------------- |
| Empty CalloutsSet                       | Return `[]`                | CalloutsSet with 0 callouts            |
| No tags on callouts                     | Return `[]`                | Callouts with empty tagsets            |
| Null tagsets                            | Skip via `??` operator     | `tagset?.tags ?? []`                   |
| Unauthorized callouts                   | Exclude from aggregation   | Authorization filter before extraction |
| Duplicate tags (same callout)           | Count each appearance      | Frequency reflects total occurrences   |
| Case variations                         | Preserve original case     | "AI" ≠ "ai" (treated as different)     |
| Classification match (case-insensitive) | `toLowerCase()` comparison | "flowState" matches "FLOWSTATE"        |

---

## Testing Data Requirements

### Test Fixtures

**Fixture 1: Typical CalloutsSet**

```json
{
  "calloutsSet": {
    "id": "cs-1",
    "callouts": [
      {
        "id": "c-1",
        "framing": {
          "profile": { "tagsets": [{ "tags": ["AI", "innovation"] }] }
        },
        "contributions": [
          { "post": { "profile": { "tagsets": [{ "tags": ["blockchain"] }] } } }
        ],
        "classification": {
          "tagsets": [{ "name": "flowState", "tags": ["published"] }]
        }
      },
      {
        "id": "c-2",
        "framing": {
          "profile": { "tagsets": [{ "tags": ["AI", "sustainability"] }] }
        },
        "classification": {
          "tagsets": [{ "name": "flowState", "tags": ["draft"] }]
        }
      }
    ]
  }
}
```

**Expected Result (getAllTags)**:

```json
["AI", "blockchain", "innovation", "sustainability"]
// AI appears 2x, others 1x; ties sorted alphabetically
```

**Expected Result (getAllTags with flowState:"published" filter)**:

```json
["AI", "blockchain", "innovation"]
// Only from callout c-1
```

---

## Migration Strategy

**Not Applicable**: No database schema changes required.

**Deployment**: Code-only change; feature available immediately after deployment.

---

## Backward Compatibility

✅ **Fully Backward Compatible**

- No breaking schema changes
- New field is additive (nullable in practice, returns `[String!]!`)
- New argument on existing field (optional, default behavior unchanged)
- Existing queries continue to work without modification

---

## Future Extensions

Potential future enhancements (currently out of scope):

1. **Whiteboard/Link Tags**: Add when domain model supports tags on these contribution types
2. **Tag Pagination**: Implement if unique tag count exceeds 5000 regularly
3. **Tag Metadata**: Return `{ tag: string, count: number }` objects instead of strings
4. **Tag Filtering on tags Field**: Apply `withTags` filter to `tags` field itself (nested filtering)
5. **Tag Categories**: Group tags by tagset name in result structure

---

## References

- **Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **API Contract**: [contracts/callouts-set-tags.graphql](./contracts/callouts-set-tags.graphql)

---

**Data Model Status**: ✅ COMPLETE
**Next**: API Contract generation (GraphQL schema fragments)
