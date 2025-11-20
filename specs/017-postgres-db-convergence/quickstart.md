# Quickstart: Postgres DB Convergence

1. Check out branch `017-postgres-db-convergence`.
2. Provision a Postgres instance (or cluster) with separate databases/schemas for Alkemio and Kratos.
3. For new installs, follow updated deployment docs to create schemas and run Postgres-compatible migrations only.
4. For existing MySQL-based installs, follow the migration runbook:
   - Take consistent MySQL backups for Alkemio and Kratos.
   - Prepare Postgres target databases.
   - Run migration tooling to transform and load data into Postgres.
   - Switch application and Kratos configurations to point to Postgres.
   - Execute the verification checklist; if successful, decommission or archive MySQL.
