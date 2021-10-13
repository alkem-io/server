# Alkemio Server Configuration

This document provides an overview of data management within the Alkemio Server.

## Migrations

Database synchronization is switched off and migrations are applied manually (or with scripts as part of the docker images).

**NB! Migrations use TypeORM CLI. Dependencies and environment variables are not loaded using nestJs - you will need the mySQL configuration in .env file in order to run the migrations locally.**

Generate new migration with name 'migration_name' after schema change:

```bash
npm run migration:generate -n [migration_name]
```

To apply migrations:

```bash
npm run migration:run
```

To revert migrations:

```bash
npm run migration:revert
```

To show status of migrations and see which migrations are pending and which migrations have been applied:

```bash
npm run migration:show
```

**NB! Running untested migrations automatically may result in a data loss!**

## MySQL Server

The server used by Alkemio is MySql.

There is specific configuration for version 8 which needs to be specified if not using the pre-supplied docker setup.

MySQL version 8 by default use `caching_sha2_password` password validation plugin that is not supported by typeORM. The plugin must be changed to 'mysql_native_password'. It can be done per user or default for the server.

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
