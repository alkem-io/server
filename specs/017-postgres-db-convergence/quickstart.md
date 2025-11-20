# Quickstart: Postgres DB Convergence

## New Installations (Postgres-Only)

1. Check out the branch with Postgres support
2. Configure environment variables in `.env.docker`:
   ```bash
   DATABASE_TYPE=postgres
   DATABASE_HOST=postgres
   DATABASE_PORT=5432
   DATABASE_USERNAME=alkemio
   DATABASE_PASSWORD=alkemio
   DATABASE_NAME=alkemio
   ```
3. Start services:
   ```bash
   pnpm run start:services
   ```
4. Run migrations:
   ```bash
   pnpm run migration:run
   ```
5. Start the Alkemio server:
   ```bash
   pnpm start
   ```

## Existing MySQL Installations (Migration Path)

### Prerequisites
- Downtime window scheduled (target: 30 minutes for typical installations)
- Postgres 17.5 instance provisioned
- MySQL backup tools available (mysqldump or similar)
- Sufficient storage for data export/import

### Migration Steps

#### Phase 1: Preparation (Before Downtime)
1. **Verify current state**:
   ```bash
   # Check MySQL data size
   mysql -u root -p -e "SELECT table_schema AS 'Database', \
     ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' \
     FROM information_schema.tables \
     WHERE table_schema IN ('alkemio', 'kratos') \
     GROUP BY table_schema;"
   ```

2. **Test migration on staging**:
   - Clone production database to staging
   - Execute full migration procedure
   - Validate data integrity
   - Measure actual downtime required

3. **Prepare Postgres databases**:
   ```bash
   docker exec -it alkemio_dev_postgres psql -U alkemio -d postgres -c "CREATE DATABASE alkemio;"
   docker exec -it alkemio_dev_postgres psql -U alkemio -d postgres -c "CREATE DATABASE kratos;"
   ```

#### Phase 2: Downtime Window (Data Migration)
1. **Stop Alkemio services**:
   ```bash
   # Stop application
   docker stop alkemio_dev_server
   # Stop Kratos
   docker stop alkemio_dev_kratos
   ```

2. **Export MySQL data**:
   ```bash
   # Export Alkemio database
   docker exec alkemio_dev_mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} \
     --single-transaction --quick --lock-tables=false \
     alkemio > /tmp/alkemio_backup.sql
   
   # Export Kratos database
   docker exec alkemio_dev_mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} \
     --single-transaction --quick --lock-tables=false \
     kratos > /tmp/kratos_backup.sql
   ```

3. **Transform MySQL dumps for Postgres compatibility**:
   ```bash
   # Use migration script (to be created in scripts/migrations)
   ./scripts/migrations/mysql-to-postgres-transform.sh /tmp/alkemio_backup.sql /tmp/alkemio_postgres.sql
   ./scripts/migrations/mysql-to-postgres-transform.sh /tmp/kratos_backup.sql /tmp/kratos_postgres.sql
   ```

4. **Import data into Postgres**:
   ```bash
   # Import Alkemio data
   docker exec -i alkemio_dev_postgres psql -U alkemio -d alkemio < /tmp/alkemio_postgres.sql
   
   # Import Kratos data
   docker exec -i alkemio_dev_postgres psql -U alkemio -d kratos < /tmp/kratos_postgres.sql
   ```

5. **Update configuration**:
   ```bash
   # Update .env.docker
   sed -i 's/DATABASE_TYPE=mysql/DATABASE_TYPE=postgres/' .env.docker
   sed -i 's/DATABASE_HOST=mysql/DATABASE_HOST=postgres/' .env.docker
   ```

6. **Start services with Postgres**:
   ```bash
   docker compose -f quickstart-services.yml --env-file .env.docker up -d
   ```

#### Phase 3: Verification
1. **Verify database connectivity**:
   ```bash
   # Check Alkemio can connect to Postgres
   docker logs alkemio_dev_server | grep -i "database\|connection"
   ```

2. **Run verification checklist** (see below)

3. **Monitor for issues**:
   ```bash
   # Watch application logs
   docker logs -f alkemio_dev_server
   ```

4. **Rollback plan** (if issues detected):
   ```bash
   # Stop services
   docker compose -f quickstart-services.yml down
   # Restore .env.docker to MySQL configuration
   # Start services with MySQL
   docker compose -f quickstart-services.yml --env-file .env.docker up -d
   ```

#### Phase 4: Post-Migration
1. **Keep MySQL running in read-only mode** for 24-48 hours
2. **Monitor application metrics** and error rates
3. **After successful validation**, decommission MySQL:
   ```bash
   docker stop alkemio_dev_mysql
   docker rm alkemio_dev_mysql
   # Optionally archive MySQL volume
   ```

### Data Verification Checklist

After migration, verify the following:

**Critical Data Checks:**
- [ ] User accounts can authenticate via Kratos
- [ ] Spaces are accessible and display correct data
- [ ] User profiles load correctly
- [ ] Authorization policies are intact
- [ ] Document/file metadata is preserved
- [ ] Timeline and calendar events are correct

**Functional Checks:**
- [ ] GraphQL API responds correctly
- [ ] User login/logout works
- [ ] Content creation/editing functions
- [ ] Comments and discussions load
- [ ] Notifications system operates
- [ ] Search functionality works

**Data Integrity Checks:**
- [ ] Row counts match between MySQL and Postgres:
  ```sql
  -- Compare table row counts
  SELECT table_name, table_rows 
  FROM information_schema.tables 
  WHERE table_schema = 'alkemio';
  ```
- [ ] Foreign key relationships are intact
- [ ] No orphaned records
- [ ] Timestamps are correctly converted

**Performance Checks:**
- [ ] Query response times acceptable
- [ ] No connection pool exhaustion
- [ ] Database connections stable

### Rollback Procedure

If critical issues are detected:

1. **Immediate rollback** (within downtime window):
   - Restore MySQL configuration in `.env.docker`
   - Restart services pointing to MySQL
   - Validate MySQL data is intact

2. **Delayed rollback** (after going live):
   - Schedule new downtime window
   - Restore from MySQL backup if data was modified
   - Investigate Postgres-specific issues
   - Plan retry with fixes
