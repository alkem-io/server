# Contract: Postgres Migration Entry Points

## New Install (Postgres-only)

- Ensure TypeORM migration chain (or baseline) for Alkemio is Postgres-compatible.
- Ensure Kratos database is initialized using its official Postgres migrations.

## Migration from MySQL

- Input: MySQL connection details for Alkemio and Kratos, Postgres target connection details.
- Output: Postgres databases with schemas and data aligned to runtime expectations.
- Behavior:
  - Validate connectivity to both source and target.
  - Validate that source schemas are at supported versions.
  - Perform data transfer and transformation.
  - Produce a machine- and human-readable report summarizing migrated objects and any discrepancies.
