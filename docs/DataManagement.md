# Alkemio Server Configuration

This document provides an overview of data management within the Alkemio Server.

## Database Backend

**Alkemio now uses PostgreSQL 17.5 as the default database backend.** MySQL support is maintained for backward compatibility but is deprecated.

## Migrations

Database synchronization is switched off and migrations are applied manually (or with scripts as part of the docker images).

**NB! Migrations use TypeORM CLI. Dependencies and environment variables are not loaded using NestJS.**

### For PostgreSQL (Default):
You will need the PostgreSQL configuration in your `.env` file:
```
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=alkemio
DATABASE_PASSWORD=alkemio
DATABASE_NAME=alkemio
```

### For MySQL (Legacy):
You will need the MySQL configuration in your `.env` file:
```
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
MYSQL_ROOT_PASSWORD=toor
MYSQL_DATABASE=alkemio
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

## MySQL Server (Legacy - Deprecated)

MySQL 8 support is maintained for backward compatibility but is deprecated.

**Note:** MySQL version 8 by default uses `caching_sha2_password` password validation plugin that is not supported by TypeORM. The plugin must be changed to 'mysql_native_password'. It can be done per user or default for the server.

If the server is already up and running create new user:

```sql
CREATE USER 'nativeuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
```

or alter existing one:

```sql
ALTER USER 'nativeuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
```

For MySQL in docker:

```bash
docker run --name some-mysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=my-secret-pw \
-d mysql \
--default-authentication-plugin=mysql_native_password
```
