# Data Model: Postgres DB Convergence

## Entities

### Alkemio Application Database Schema

- **Description**: Logical grouping of all tables used by the core Alkemio application (spaces, users, content, configuration, events).
- **Key Considerations**:
  - Ensure all table definitions and constraints are Postgres-compatible.
  - Map MySQL-specific types (e.g., `TINYINT(1)`, `DATETIME`) to appropriate Postgres types (e.g., `BOOLEAN`, `TIMESTAMPTZ`).
  - Validate foreign keys and indexes for performance under Postgres.

### Kratos Identity Database Schema

- **Description**: Tables and relations managed by Ory Kratos for identities, credentials, sessions, and flows.
- **Key Considerations**:
  - Use upstream Kratos Postgres schema and migrations as the source of truth.
  - Maintain separate database or schema from Alkemio application tables.

### Migration Plan & Artifacts

- **Description**: Scripts, tools, configuration, and documentation for moving data from MySQL to Postgres and/or bootstrapping fresh Postgres environments.
- **Key Considerations**:
  - Idempotent migrations and clear versioning.
  - Ability to validate schemas and data integrity post-migration.

## Relationships

- Alkemio Application Schema and Kratos Schema live in the same Postgres 17.5 cluster but remain logically separated (different databases or schemas).
- Migration artifacts operate across both MySQL and Postgres instances, but runtime application access is only to Postgres after cut-over.

## Validation Rules

- All primary and foreign key constraints must be valid under Postgres and enforce referential integrity.
- String lengths and encodings must be compatible with Postgres defaults (e.g., UTF-8).
- Any new constraints introduced for Postgres (e.g., tighter NOT NULL or unique indexes) must be explicitly validated against existing MySQL data before migration.

## Migration Strategy Decision

After analyzing the existing 94 TypeORM migrations, we have decided on the following approach:

### Approach: Hybrid Strategy - Continue with Existing Migrations

**Rationale:**

1. TypeORM can handle cross-database migrations if written properly
2. Existing migrations represent valuable schema evolution history
3. Creating a new baseline would require extensive validation
4. The transformation script handles MySQL→Postgres data conversion adequately

**Implementation:**

1. **Keep existing migrations for both MySQL and Postgres**
2. **Use database-agnostic TypeORM APIs in new migrations**
3. **Let TypeORM handle syntax differences** through its driver abstraction
4. **Test migrations against both databases** in development

### Migration Execution Strategy

**For New Installations (Empty Database):**

- Run all existing migrations in sequence
- TypeORM's Postgres driver will adapt the syntax automatically where possible
- Some migrations may need manual intervention if they use raw SQL

**For Existing MySQL Installations:**

1. Export and transform data using migration scripts
2. Import into Postgres
3. Manually insert migration records into `migrations_typeorm` table to mark them as executed

**For Existing Postgres Installations:**

- Continue with incremental migrations as normal

### Database-Agnostic Migration Guidelines

All new migrations should follow these rules:

1. **Use TypeORM's QueryRunner API** instead of raw SQL where possible:

   ```typescript
   // Good
   await queryRunner.createTable(new Table({ ... }));

   // Avoid
   await queryRunner.query("CREATE TABLE ...");
   ```

2. **Let TypeORM generate DDL** through entity definitions
3. **Avoid database-specific functions** in default values or constraints
4. **Test against both MySQL and Postgres** before committing

### Known Limitations

Some existing migrations use raw SQL with MySQL syntax. For Postgres:

- These will need to be skipped during fresh Postgres installations
- The schema can be bootstrapped using TypeORM's `synchronize: true` in development
- Production Postgres installations will use data migration + manual schema setup

### Validation Strategy

**Schema Compatibility Testing:**

- Compare schemas between MySQL and Postgres after migrations
- Ensure entity definitions match both database schemas
- Validate that queries work on both databases

**Integration Testing:**

- Run test suite against both MySQL and Postgres
- Verify all CRUD operations function correctly
- Check constraint enforcement
- Validate performance characteristics
