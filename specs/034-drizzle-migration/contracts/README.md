# Contracts: 034-drizzle-migration

No API contract changes for this feature.

This migration replaces the ORM layer (TypeORM → Drizzle) without modifying:
- GraphQL schema (no new types, fields, mutations, or queries)
- REST endpoints
- Database schema (tables, columns, indices, constraints remain identical)
- External service integrations

The `schema-baseline.graphql` contract artifact remains unchanged.
