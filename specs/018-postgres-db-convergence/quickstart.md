# Quickstart: Postgres DB Convergence – Schema-First & CSV Data Path

## Prerequisites

- Running MySQL-based Alkemio + Kratos deployment.
- Target Postgres instance with databases for Alkemio and Kratos.
- Access to this repository with Node 20, pnpm, and Docker installed.

## Step 1: Prepare Postgres Schemas

1. Apply official Kratos migrations to the Kratos Postgres database.
2. Apply the Alkemio Postgres baseline migration to the Alkemio Postgres database.
3. Verify schemas using existing contract tests and migration validation scripts.

## Step 2: Export Data from MySQL

1. Run the export script to dump MySQL data into CSV files (users, spaces, memberships, content, identities, etc.).
2. Store CSV files on a mounted filesystem path accessible to the import process.

## Step 3: Import Data into Postgres

1. Run the import script against the prepared Postgres databases, pointing it to the CSV directory.
2. Monitor logs for any constraint violations; the process will fail-fast on the first error.

## Step 4: Verify and Cut Over

1. Execute the migration verification checklist (authentication, space access, content integrity, key authorization flows).
2. If all checks pass, update application configuration to point Alkemio and Kratos to the Postgres databases.
3. If critical issues are found, follow the rollback section of the runbook to return to the MySQL-backed system.
