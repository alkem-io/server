# Contracts: Session Sync Removal

No public GraphQL or REST contracts change for this feature. The work is strictly internal (module + configuration removal). Validation steps:

1. Re-generate the GraphQL schema (`pnpm run schema:print && pnpm run schema:sort`) to confirm `schema.graphql` remains unchanged.
2. Run `pnpm run schema:diff` to verify there are zero breaking or additive contract deltas.
3. If automation surfaces differences, treat them as regressions because the feature must not modify user-facing APIs.
