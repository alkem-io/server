# Quickstart: Verifying the ExploreAllSpaces Optimization

## Prerequisites

- Local development environment running (`pnpm run start:services`)
- Database seeded with at least 10 L0 spaces with lead users and organizations
- Elastic APM configured (or alternatively, TypeORM query logging enabled)

## Verification Steps

### 1. Baseline Measurement (before changes)

```bash
# Start server with query logging
DATABASE_LOGGING=true pnpm start:dev
```

Execute the full ExploreAllSpaces query via GraphQL playground at `/graphiql`:

```graphql
query ExploreAllSpaces {
  exploreSpaces {
    id
    level
    about {
      id
      isContentPublic
      profile {
        id
        url
        displayName
        tagline
        avatar: visual(type: AVATAR) { id uri name alternativeText }
        cardBanner: visual(type: CARD) { id uri name alternativeText }
        tagset { id tags }
      }
      membership {
        myMembershipStatus
        leadUsers {
          id
          profile {
            id
            url
            displayName
            avatar: visual(type: AVATAR) { id uri name alternativeText }
          }
        }
        leadOrganizations {
          id
          profile {
            id
            url
            displayName
            avatar: visual(type: AVATAR) { id uri name alternativeText }
          }
        }
      }
    }
  }
}
```

Count the number of `SELECT` statements in the console output that reference `credential` or `user`/`organization` tables. Note the count.

### 2. Post-Optimization Verification

After applying changes:

1. **Build**: `pnpm build`
2. **Run**: `DATABASE_LOGGING=true pnpm start:dev`
3. Execute the same query
4. Verify:
   - Response data is identical to baseline
   - Credential-related `SELECT` statements reduced from N-per-space to 2 total (1 for users, 1 for organizations)
   - No new N+1 patterns visible in logs

### 3. Functional Correctness

- Compare JSON response before/after — all fields should match
- Test with a space that has no lead users → should return empty array
- Test with a space that has no lead organizations → should return empty array

### 4. APM Verification (production/staging)

After deployment, compare `transaction.span_count.started` for the `ExploreAllSpaces` transaction:
- Baseline: 494 average spans
- Target: ~436 or lower (58 credential spans eliminated)

### 5. Query Count Verification (measured 2026-02-18)

| Stage | SQL queries | Notes |
| --- | --- | --- |
| Baseline (old) | 34 | Measured with local dev dataset (~7 spaces); N+1 credential lookups scale to ~60 queries for the default 30-space limit |
| After Phases 1–4 | 14 | Credential lookups batched into 2 queries |
| After Phase 5 | 13 | `SpaceCommunityWithRoleSetLoaderCreator` merged into `SpaceBySpaceAboutIdLoaderCreator` |
| Theoretical minimum | 9 | Requires architectural changes (deferred) |

To verify the current query count, run with `DATABASE_LOGGING=true` and count lines starting with `query: SELECT`.
