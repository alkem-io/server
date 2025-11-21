# Quality Assurance + Testing

Initial version of integration tests is in place. To run them, look at the prerequisites, below:

- Used frameworks/packages [jest](https://jestjs.io/) and `supertest`
- Running `MySQL sql server`
- Running `Alkemio/Server` service.
- `LOGGING_CONSOLE_ENABLED=false` can be used to disable logging the exceptions (exceptions are quite verbose and will pollute the test results log).
- In order to run the unit, integration and end-to-end, navigate to the `/Server` repository, and execute the following command: `pnpm run test:[TEST_TYPE]` where TEST_TYPE is `e2e` for end-to-end, `it` for
  integration tests and `ut` for unit tests
  - To run specific suite: `pnpm run test:[TEST_TYPE] jest --config ./test folder>/<test suite file>` (i.e. `./test/user.e2e-spec.ts`)
- The results of the test, will be displayed at the end of the execution.

Automation test structure

```
server/
 src/
  domain/
   challenge/
     challenge.service.ts
     challenge.service.spec.ts
 test/
  config/
    jest.config.ci.ts
    etc...
  functional/
   e2e/
    user-management/
      create-user.e2e-spec.ts
   integration/
    challenge/
      create-challenge.e2e-spec.ts
   non-functional/
    auth/
      anonymous-user.it-spec.ts
   utils/
     graphql.request.ts
```

Test types

    - unit tests: `*.spec.ts` testing functions part of a service
    - functional e2e tests: `*.e2e-spec.ts` testing functionallity and its integration with third part services (i.e. "Ory Kratos")
    - functional integration tests: `*.it-spec.ts` API testing of application services

Run tests:

    - run all tests: `pnpm run test:nightly`
    - run all tests from particular area: `pnpm run test:it ./test/functional/integration/challenge/`
    - run all tests for a test file: `pnpm run test:it ./test/functional/integration/challenge/query-challenge-data.it-spec.ts`
    - run e2e tests with coverage: `pnpm run test:e2e-cov`

To debug tests in VS Code

- Use `Debug Jest e2e Tests` configuration for API tests
- Use `Debug Jest CI Tests` configuration for CI tests

To run only one test from a test file

- Set the keyword _.only_ after `test` or `describe` (i.e. `test.only('should remove a challenge', async () => {})`)
- Run the command for this particular test file: `pnpm run test:it ./test/functional/integration/challenge/query-challenge-data.it-spec.ts`

## Static Code Analysis with SonarQube

The repository uses SonarQube for static code analysis to maintain code quality standards. SonarQube analysis runs automatically on:

- Every pull request targeting the `develop` or `main` branches
- Every push to the `develop` branch
- Manual workflow dispatch

### Viewing Analysis Results

1. **In Pull Requests**: Check the PR checks/status section for the "SonarQube Static Analysis" status
2. **SonarQube Dashboard**: View detailed metrics at https://sonarqube.alkem.io for the alkemio-server project

### Quality Gate

The SonarQube quality gate is **advisory only** and does not block merges. However:

- Failed quality gates should be reviewed and addressed when possible
- Release managers should check the quality gate status before cutting releases
- Metrics tracked include: coverage, bugs, vulnerabilities, and code smells

### For More Information

See the detailed quickstart guide at `specs/015-sonarqube-analysis/quickstart.md` for:

- CI secrets configuration
- Token rotation procedures
- Troubleshooting common issues
- How to read SonarQube dashboards

## Update user password secret for Travis CI

In order to be able to update the user secret (used in automation tests) for Travis CI configuration, the following steps, should be performed:

- Install `ruby`
  ```sh
  sudo apt update
  sudo apt install ruby-full
  ruby --version
  ```
- Install travis gem: `gem install travis`
- Authenticate to travis throught console: `travis login --pro --github-token [token]`
  - the token could be taken/generated from github settings
- From `server` repo, remove the existing `secret` (secure: ) from `.travis.yml`
- Escape the password special characters
  - Note: when useng `"double quotes"` for the variable, escaping is done with double backslash `\\`
  - Example: password: `t3$t@e!st`, escaped: `"t3\\\$t\\@e\\!st"`
  - Special: the `$` should be escaped with 3 backaslashes `\\\`
- In console run: `travis encrypt --pro AUTH_AAD_TEST_HARNESS_PASSWORD="t3\\\$t\\@e\\!st" --add`
  - The command will generate `scure: [encrypted password]` in `.travis.yml` file
- Commit changes :)

## Database Migration Testing

### Rehearsing PostgreSQL Migration on Staging

Before performing a production migration from MySQL to PostgreSQL, it is **critical** to rehearse the complete migration process on a staging environment that mirrors production. This section outlines the rehearsal procedure.

#### Prerequisites for Migration Rehearsal

**Environment Setup:**
- [ ] Staging environment with production-like data size
- [ ] Clone of production MySQL databases (Alkemio + Kratos)
- [ ] Target PostgreSQL 17.5 instance
- [ ] Access to migration scripts (`.scripts/migrations/postgres-convergence/`)
- [ ] Sufficient disk space (~1.5x MySQL data size)
- [ ] Monitoring tools configured

**Data Preparation:**
- [ ] Production database exported to staging (sanitized if needed)
- [ ] Data volume representative of production
- [ ] Edge cases present (large JSON, special characters, etc.)
- [ ] Known data issues documented

#### Rehearsal Execution Steps

**1. Baseline Capture**
```bash
# Document current state
cd .scripts/migrations/postgres-convergence

# Capture MySQL metrics
docker exec mysql-container mysql -u root -p${MYSQL_ROOT_PASSWORD} \
  -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='alkemio';" \
  > baseline_mysql_rowcounts.txt

# Capture performance baseline
curl -o baseline_response.json http://staging.example.com:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ spaces { id nameID } }"}'

# Time baseline query
time curl http://staging.example.com:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users(first: 100) { id email } }"}'
```

**2. Execute Migration**
```bash
# Follow complete migration runbook (see docs/DataManagement.md)
# Document start time
START_TIME=$(date +%s)

# Run export scripts
./export_alkemio_mysql_to_csv.sh
./export_kratos_mysql_to_csv.sh

# Run import scripts
./import_csv_to_postgres_alkemio.sh csv_exports/alkemio/[timestamp]
./import_csv_to_postgres_kratos.sh csv_exports/kratos/[timestamp]

# Document end time
END_TIME=$(date +%s)
MIGRATION_DURATION=$((END_TIME - START_TIME))
echo "Migration took: ${MIGRATION_DURATION} seconds"
```

**3. Verification and Validation**
```bash
# Run complete verification checklist
# See: specs/018-postgres-db-convergence/verification-checklist.md

# Compare row counts
docker exec postgres psql -U alkemio -d alkemio \
  -c "SELECT tablename, n_live_tup FROM pg_stat_user_tables ORDER BY tablename;" \
  > postgres_rowcounts.txt

# Compare files
diff baseline_mysql_rowcounts.txt postgres_rowcounts.txt

# Performance comparison
time curl http://staging.example.com:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users(first: 100) { id email } }"}'
```

**4. Test Critical Paths**
- [ ] User authentication (at least 5 different users)
- [ ] Space navigation and browsing
- [ ] Content creation and editing
- [ ] Search functionality
- [ ] Authorization checks
- [ ] File upload/download
- [ ] GraphQL mutations
- [ ] Complex queries with joins

**5. Test Rollback Procedure**
```bash
# Practice rollback to ensure it works
# Follow rollback procedure (see docs/DataManagement.md)

# Switch back to MySQL
export DATABASE_TYPE=mysql
docker compose down
docker compose up mysql kratos -d

# Verify MySQL is working
pnpm start &
sleep 10
curl http://staging.example.com:3000/graphql
```

**6. Capture Results**
```bash
# Generate rehearsal report
cat > migration_rehearsal_report.md << EOF
# Migration Rehearsal Report

**Date**: $(date)
**Environment**: Staging
**Data Size**: [document size]

## Timing
- Export duration: [X] minutes
- Import duration: [X] minutes
- Total migration time: ${MIGRATION_DURATION} seconds
- Downtime estimate: [X] minutes

## Verification Results
- Row count matches: [X/X tables]
- Authentication tests: [Pass/Fail]
- Critical path tests: [X/X passed]
- Performance: [comparable/degraded/improved]

## Issues Encountered
1. [List any issues]
2. [Resolutions applied]

## Rollback Test
- Rollback successful: [Yes/No]
- Rollback duration: [X] minutes

## Recommendations
- [Production readiness assessment]
- [Required fixes before production]
- [Suggested improvements]

## Sign-off
- QA Engineer: _______________
- Database Admin: _______________
- Tech Lead: _______________
EOF
```

#### Rehearsal Success Criteria

Migration rehearsal is **approved for production** if:
- [ ] Total migration time ≤ 30 minutes (or agreed SLA)
- [ ] All critical table row counts match (within ±1 for async operations)
- [ ] Authentication works for all test users
- [ ] All critical path tests pass
- [ ] Performance within acceptable range (≤10% degradation)
- [ ] No data corruption detected
- [ ] Rollback procedure tested and successful
- [ ] All issues documented and resolved

#### Production Migration Preparation

After successful rehearsal:
1. Document actual timing for production estimates
2. Update runbook with any lessons learned
3. Schedule production migration window
4. Brief all stakeholders on procedure and timing
5. Prepare communication templates
6. Assign roles and responsibilities
7. Establish escalation procedures

#### Post-Rehearsal Actions

- [ ] Share rehearsal report with stakeholders
- [ ] Get approval from Tech Lead and Database Admin
- [ ] Update migration scripts based on findings
- [ ] Schedule production migration
- [ ] Brief on-call team about migration

### Migration Rehearsal Frequency

- **First rehearsal**: 2 weeks before planned production migration
- **Second rehearsal** (if needed): 1 week before production migration
- **Final rehearsal**: 2-3 days before production (if significant changes)

Each rehearsal should improve timing and reduce risk.

## Resources

- [TravisCI documentation](https://docs.travis-ci.com/user/environment-variables/)
- [PostgreSQL Migration Runbook](DataManagement.md#complete-migration-runbook)
- [Migration Verification Checklist](../specs/018-postgres-db-convergence/verification-checklist.md)
