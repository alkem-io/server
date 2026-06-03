# Quickstart: Paginated Innovation Library

**Feature**: 101-innovation-library-pagination (Option A — documented cursor pattern)

## Prerequisites
```bash
pnpm install
pnpm run start:services      # PostgreSQL 17.5, RabbitMQ, Redis, Ory
pnpm run migration:run       # applies the new rowId migration
pnpm start:dev               # GraphQL playground: /graphiql
```

## 1. First page of templates (newest first, page 25)
```graphql
query {
  platform { library {
    templatesPaginated(first: 5) {
      total
      templateResults {
        template { id type profile { displayName } }
        innovationPack { id profile { displayName } }
      }
      pageInfo { startCursor endCursor hasNextPage hasPreviousPage }
    }
  } }
}
```
Expect: ≤5 newest results, `total` = all eligible templates, `hasNextPage=true`
if `total>5`, `hasPreviousPage=false`.

## 2. Next page via cursor + type filter (filtered total)
```graphql
query {
  platform { library {
    templatesPaginated(filter: { types: [CALLOUT] }, first: 5, after: "<endCursor from #1>") {
      total
      templateResults { template { id profile { displayName } } }
      pageInfo { hasNextPage hasPreviousPage }
    }
  } }
}
```
Expect: only CALLOUT templates; `total` = CALLOUT count; continues after the
cursor with no overlap; `hasPreviousPage=true`.

## 3. Paginated packs (newest first) + cursor forward
```graphql
query {
  platform { library {
    innovationPacksPaginated(first: 10) {
      total
      innovationPacks { id profile { displayName } }
      pageInfo { endCursor hasNextPage }
    }
  } }
}
```
Then re-run with `first: 10, after: "<endCursor>"`; confirm the
next distinct slice, no repeats.

## 4. Backward-compatibility (must be unchanged)
```graphql
query {
  platform { library {
    templates { template { id } innovationPack { id } }
    innovationPacks(queryData: { orderBy: RANDOM }) { id }
  } }
}
```
Expect: identical shape/behaviour to before this feature (alphabetical templates,
RANDOM packs still available here).

## 5. Edge cases
- `first: 1000` → capped to 100 items.
- `first: 1, last: 1` → validation error (conflicting directions).
- `after: "<unknown-uuid>", first: 5` → clear not-found error.
- `first: 5, after: "<last item cursor>"` → empty page,
  `hasNextPage=false`.
- `filter: { types: [] }` / a type with no templates → empty page, `total=0`.

## 6. Migration validation
```bash
bash .scripts/migrations/run_validate_migration.sh
pnpm run migration:revert   # confirm down-migration drops rowId cleanly
pnpm run migration:run
```

## 7. Schema contract (must be additive; rowId NOT exposed)
```bash
cp schema.graphql tmp/prev.schema.graphql
pnpm run schema:print && pnpm run schema:sort
pnpm run schema:diff        # review change-report.json: additive only, no `rowId` field
```

## 8. Tests
```bash
pnpm test -- src/library/library/library.service.spec.ts
pnpm lint
```
