# Quickstart: Callouts Tag Cloud Feature

**Feature**: 014-callouts-tag-cloud
**Audience**: Developers integrating or testing the tag cloud functionality
**Date**: 2025-11-06

---

## 🚀 Quick Links

- **Spec**: [spec.md](./spec.md)
- **API Contract**: [contracts/callouts-set-tags.graphql.md](./contracts/callouts-set-tags.graphql.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Research**: [research.md](./research.md)

---

## 📋 Prerequisites

Before using this feature, ensure:

1. ✅ Server running locally or accessible remotely
2. ✅ GraphQL Playground available at `/graphiql`
3. ✅ Valid authentication token (if auth enabled)
4. ✅ At least one CalloutsSet with Callouts containing tags

---

## 🎯 What This Feature Does

**Tag Aggregation** (`CalloutsSet.tags` field):

- Aggregates all tags from Callouts and their Post contributions
- Sorts by frequency (most popular first), then alphabetically
- Optionally filters by Callout classification (e.g., flowState)

**Tag-Based Filtering** (`CalloutsSet.callouts` with `withTags` arg):

- Filters Callouts to show only those containing specified tags
- Searches both Callout framing and contribution tags
- Combines with existing filters (contribution types, classification)

---

## 🏃 Quick Start (5 minutes)

### Step 1: Find a CalloutsSet ID

```graphql
query FindCalloutsSet {
  spaces(first: 1) {
    id
    nameID
    collaboration {
      calloutsSet {
        id
      }
    }
  }
}
```

Copy the `calloutsSet.id` value (e.g., `"uuid-abc-123"`).

---

### Step 2: Query the Tag Cloud

```graphql
query GetTagCloud {
  lookup {
    calloutsSet(ID: "uuid-abc-123") {
      id
      tags
    }
  }
}
```

**Expected Result**:

```json
{
  "data": {
    "lookup": {
      "calloutsSet": {
        "id": "uuid-abc-123",
        "tags": ["innovation", "sustainability", "AI", "blockchain"]
      }
    }
  }
}
```

---

### Step 3: Filter Callouts by Tag

```graphql
query GetAICallouts {
  lookup {
    calloutsSet(ID: "uuid-abc-123") {
      id
      callouts(withTags: ["AI"]) {
        id
        nameID
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

**Expected Result**:

```json
{
  "data": {
    "lookup": {
      "calloutsSet": {
        "id": "uuid-abc-123",
        "callouts": [
          {
            "id": "callout-1",
            "nameID": "ai-research",
            "framing": {
              "profile": {
                "displayName": "AI Research Topics",
                "tagsets": [
                  {
                    "tags": ["AI", "research", "innovation"]
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

✅ **Success!** You've queried the tag cloud and filtered Callouts by tags.

---

## 📖 Common Use Cases

### Use Case 1: Display Tag Cloud UI

**Goal**: Show a visual tag cloud with click-to-filter functionality

```graphql
query TagCloudUI($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id

      # Get all tags for the cloud
      tags

      # Get all callouts for initial display
      callouts {
        id
        nameID
        framing {
          profile {
            displayName
            description
          }
        }
      }
    }
  }
}
```

**Client-Side Logic**:

1. Display tags in decreasing size (frequency-based)
2. On tag click → query again with `callouts(withTags: [selectedTag])`
3. Update callout list with filtered results

---

### Use Case 2: Filter Tag Cloud by Workflow State

**Goal**: Show tags only from "published" Callouts

```graphql
query PublishedTagCloud($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      id
      tags(classificationTagsets: [{ name: "flowState", tags: ["published"] }])
    }
  }
}
```

**Use Case**: Knowledge base showing only finalized content tags.

---

### Use Case 3: Multi-Tag Filter (OR Logic)

**Goal**: Show Callouts tagged with "AI" OR "machine-learning"

```graphql
query MultiTagFilter($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      callouts(withTags: ["AI", "machine-learning"]) {
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

**Logic**: Callout matches if it has **any** of the specified tags.

---

### Use Case 4: Combined Filters (Advanced)

**Goal**: Published POST Callouts about "sustainability"

```graphql
query AdvancedFilter($calloutsSetId: UUID!) {
  lookup {
    calloutsSet(ID: $calloutsSetId) {
      callouts(
        withTags: ["sustainability"]
        withContributionTypes: [POST]
        classificationTagsets: [{ name: "flowState", tags: ["published"] }]
      ) {
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

**Logic**: All filters must match (AND logic between different filter types).

---

## 🧪 Testing the Feature

### Manual Test Checklist

- [ ] **Test 1**: Query `tags` on CalloutsSet with multiple Callouts
  - ✅ Returns array of tags
  - ✅ Tags sorted by frequency then alphabetically

- [ ] **Test 2**: Query `tags` with classification filter
  - ✅ Only tags from matching Callouts returned

- [ ] **Test 3**: Query `callouts(withTags: [...])` with single tag
  - ✅ Only matching Callouts returned

- [ ] **Test 4**: Query `callouts(withTags: [...])` with multiple tags
  - ✅ Callouts with ANY tag returned (OR logic)

- [ ] **Test 5**: Authorization check
  - ✅ Tags from unauthorized Callouts not included
  - ✅ Unauthorized Callouts not returned in filtered list

---

### Integration Test Example

```typescript
describe('CalloutsSet Tag Cloud', () => {
  it('should return tags sorted by frequency', async () => {
    // Arrange: Create CalloutsSet with Callouts
    const calloutsSet = await createCalloutsSetWithTags([
      { tags: ['AI', 'innovation'] },
      { tags: ['AI', 'blockchain'] },
      { tags: ['sustainability'] },
    ]);

    // Act: Query tags
    const result = await graphqlQuery(`
      query {
        lookup {
          calloutsSet(ID: "${calloutsSet.id}") {
            tags
          }
        }
      }
    `);

    // Assert: AI appears 2x (first), others 1x (alphabetical)
    expect(result.data.lookup.calloutsSet.tags).toEqual([
      'AI', // frequency: 2
      'blockchain', // frequency: 1 (alpha order)
      'innovation', // frequency: 1 (alpha order)
      'sustainability', // frequency: 1 (alpha order)
    ]);
  });
});
```

---

## 🔧 Troubleshooting

### Issue 1: Empty Tag Array Returned

**Symptom**: `tags` field returns `[]` even though Callouts exist

**Possible Causes**:

1. Callouts have no tags in their framing or contributions
2. User lacks READ permission on all Callouts
3. Classification filter excludes all Callouts

**Debug Steps**:

```graphql
query Debug {
  lookup {
    calloutsSet(ID: "uuid") {
      callouts {
        id
        framing {
          profile {
            tagsets {
              name
              tags
            }
          }
        }
        contributions {
          ... on CalloutContributionPost {
            post {
              profile {
                tagsets {
                  tags
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Check if `tagsets` arrays are populated.

---

### Issue 2: Tag Filter Not Working

**Symptom**: `callouts(withTags: [...])` returns all Callouts or none

**Possible Causes**:

1. Tag name case mismatch (tags are case-sensitive)
2. Tags only in inaccessible Callouts (authorization)
3. Tags in whiteboard/link contributions (not supported yet)

**Debug Steps**:

1. Query without filter, inspect returned tag values
2. Copy exact tag string from result
3. Use copied string in `withTags` argument

---

### Issue 3: Slow Performance

**Symptom**: Query takes >5s to complete

**Possible Causes**:

1. CalloutsSet has >200 Callouts (beyond optimized range)
2. Network latency or database connection issues
3. Conditional loading not working (tags always loaded)

**Debug Steps**:

```graphql
query PerformanceCheck {
  lookup {
    calloutsSet(ID: "uuid") {
      # Query WITHOUT withTags (should be fast)
      callouts {
        id
      }
    }
  }
}
```

If this is fast but `withTags` is slow, conditional loading is working correctly. Performance issue is in tag extraction/filtering logic.

---

## 🎨 UI Integration Example

### React Component (TypeScript)

```typescript
import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';

const GET_TAG_CLOUD_DATA = gql`
  query GetTagCloudData($calloutsSetId: UUID!, $selectedTags: [String!]) {
    lookup {
      calloutsSet(ID: $calloutsSetId) {
        id
        tags
        callouts(withTags: $selectedTags) {
          id
          nameID
          framing {
            profile {
              displayName
              description
            }
          }
        }
      }
    }
  }
`;

export function TagCloudKnowledgeBase({ calloutsSetId }: { calloutsSetId: string }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, loading } = useQuery(GET_TAG_CLOUD_DATA, {
    variables: {
      calloutsSetId,
      selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
    },
  });

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag) // Remove if already selected
        : [...prev, tag]              // Add if not selected
    );
  };

  if (loading) return <div>Loading...</div>;

  const tags = data?.lookup?.calloutsSet?.tags ?? [];
  const callouts = data?.lookup?.calloutsSet?.callouts ?? [];

  return (
    <div>
      {/* Tag Cloud */}
      <div className="tag-cloud">
        {tags.map((tag, index) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
            style={{ fontSize: `${1.5 - index * 0.05}rem` }} // Frequency-based size
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Callout List */}
      <div className="callouts">
        {callouts.map(callout => (
          <div key={callout.id} className="callout-card">
            <h3>{callout.framing.profile.displayName}</h3>
            <p>{callout.framing.profile.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Performance Guidelines

### Recommended Limits

| CalloutsSet Size | Query Time | User Experience     |
| ---------------- | ---------- | ------------------- |
| < 50 Callouts    | < 500ms    | Instant             |
| 50-100 Callouts  | 500ms-1s   | Fast                |
| 100-200 Callouts | 1-2s       | Acceptable          |
| 200+ Callouts    | 2-5s       | Consider pagination |

### Optimization Tips

1. **Cache tag cloud data** (client-side) - tags change infrequently
2. **Debounce tag clicks** - avoid rapid re-queries
3. **Prefetch callouts** - load callout details on hover
4. **Limit displayed tags** - show top 50 in UI, even if more available

---

## 🔒 Authorization Notes

### What Users Can See

✅ **Allowed**:

- Tags from Callouts they have READ access to
- Callouts they have READ access to (when filtering)

❌ **Blocked**:

- Tags from Callouts they cannot READ
- Callouts they cannot READ (silently filtered)

### Testing Authorization

**Test 1: Anonymous User**

```graphql
# Should return only public Callouts/tags
query PublicTags {
  lookup {
    calloutsSet(ID: "uuid") {
      tags
    }
  }
}
```

**Test 2: Authenticated Member**

```graphql
# Should return member-visible + public Callouts/tags
query MemberTags {
  lookup {
    calloutsSet(ID: "uuid") {
      tags
    }
  }
}
```

---

## 📚 Additional Resources

- **GraphQL Schema**: `schema.graphql` (after regeneration)
- **Service Implementation**: `src/domain/collaboration/callouts-set/callouts.set.service.ts`
- **Resolver**: `src/domain/collaboration/callouts-set/callouts.set.resolver.fields.ts`
- **DTOs**: `src/domain/collaboration/callouts-set/dto/callouts.set.args.*.ts`
- **Tests**: `test/functional/integration/callouts-set/callouts-set-tags.it.spec.ts`

---

## 🆘 Getting Help

**Issue**: Feature not working as expected?

1. Check this quickstart guide
2. Review [spec.md](./spec.md) for expected behavior
3. Check [research.md](./research.md) for implementation decisions
4. Contact: Development team via GitHub issues

---

**Quickstart Status**: ✅ COMPLETE
**Last Updated**: 2025-11-06
**Feedback**: Submit issues or suggestions to improve this guide
