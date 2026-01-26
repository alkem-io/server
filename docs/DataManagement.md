# Alkemio Server Configuration

This document provides an overview of data management within the Alkemio Server.

## Database Backend

**Alkemio uses PostgreSQL 17.5 as the database backend.**

## Migrations

Database synchronization is switched off and migrations are applied manually (or with scripts as part of the docker images).

**NB! Migrations use TypeORM CLI. Dependencies and environment variables are not loaded using NestJS.**

### PostgreSQL Configuration

You will need the PostgreSQL configuration in your `.env` file:

```
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=alkemio
DATABASE_PASSWORD=alkemio
DATABASE_NAME=alkemio
```

Generate new migration with name 'migration_name' after schema change:

```bash
pnpm run migration:generate -n [migration_name]
```

To apply migrations:

```bash
pnpm run migration:run
```

To revert migrations:

```bash
pnpm run migration:revert
```

To show status of migrations and see which migrations are pending and which migrations have been applied:

```bash
pnpm run migration:show
```

**NB! Running untested migrations automatically may result in a data loss!**

## PostgreSQL Server (Default)

Alkemio uses PostgreSQL 17.5 as the primary database backend for both the Alkemio application and Ory Kratos identity service.

### Supported PostgreSQL Versions

**Target Version**: PostgreSQL 17.5

**Minimum Supported Version**: PostgreSQL 14.x

The Postgres convergence strategy is tested and officially supported on PostgreSQL 17.5. While scripts and migrations maintain compatibility with PostgreSQL 14.x and above, PostgreSQL 17.5 is the recommended and officially supported version for production deployments. This aligns with current cloud provider offerings and maintained PostgreSQL versions.

### Database Structure

The default Docker Compose setup automatically provisions PostgreSQL with the required databases:

- `alkemio` - Main application database
- `kratos` - Ory Kratos identity database
- `hydra` - Ory Hydra OAuth2 database
- `synapse` - Matrix Synapse messaging database

For PostgreSQL in docker:

```bash
docker run --name alkemio-postgres \
-p 5432:5432 \
-e POSTGRES_USER=alkemio \
-e POSTGRES_PASSWORD=alkemio \
-e POSTGRES_DB=alkemio \
-d postgres:17.5
```

### Kratos Identity Schema on PostgreSQL

Ory Kratos, the identity and user management system used by Alkemio, provides official PostgreSQL migration support.

#### Applying Kratos Migrations

**Option 1: Automatic Migration on Container Startup** (Recommended)

The easiest approach is to configure the Kratos container to automatically apply migrations on startup:

```yaml
# docker-compose.yml or similar
kratos:
  image: oryd/kratos:v1.0.0
  command:
    - serve
    - --config
    - /etc/config/kratos/kratos.yml
    - migrate
    - sql
    - -e
    - --yes
  environment:
    - DSN=postgres://alkemio:alkemio@postgres:5432/kratos?sslmode=disable
```

**Option 2: Manual Migration**

Apply migrations manually using the Kratos CLI:

```bash
# Using Docker
docker exec -it kratos kratos migrate sql -e --yes \
  --config /etc/config/kratos/kratos.yml

# Or using Kratos binary directly
kratos migrate sql -e --yes \
  --config /path/to/kratos.yml
```

#### Verifying Kratos Schema

After applying migrations, verify the Kratos database schema:

```sql
-- Check migration status
SELECT * FROM _kratos_migrations ORDER BY applied_at DESC;

-- Verify core tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('identities', 'identity_credentials', 'sessions',
                     'identity_credential_identifiers', 'session_devices',
                     'identity_verifiable_addresses', 'identity_recovery_addresses')
ORDER BY table_name;

-- Check identity count
SELECT COUNT(*) as identity_count FROM identities;
```

#### Kratos Configuration for PostgreSQL

Ensure your Kratos configuration (`kratos.yml`) includes the correct DSN:

```yaml
dsn: postgres://username:password@host:port/database?sslmode=disable

# For production, use secure connections:
dsn: postgres://username:password@host:port/database?sslmode=require
```

#### Migration Documentation

For detailed Kratos migration documentation, see:

- Official Kratos Documentation: https://www.ory.sh/docs/kratos/manage-identities/migrations
- Kratos GitHub: https://github.com/ory/kratos
