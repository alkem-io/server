# PostgreSQL Migration Verification Checklist

Use this checklist after completing a MySQL to PostgreSQL migration to verify that all data and functionality have been successfully migrated.

## Pre-Migration Baseline

Before starting migration, capture baseline metrics:

- [ ] Record MySQL table row counts
- [ ] Document current system performance metrics
- [ ] Export sample data for comparison
- [ ] Create MySQL backup
- [ ] Document any known issues or warnings

## Phase 1: Data Integrity Verification

### Table Row Counts

- [ ] Compare row counts for all tables between MySQL (source) and PostgreSQL (target)
- [ ] Verify counts match within acceptable tolerance (±1 for async operations)
- [ ] Document any discrepancies with explanations

**Verification Query (PostgreSQL):**
```sql
SELECT tablename, n_live_tup as row_count 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Critical Tables Verification

Verify these critical tables exist and have data:

- [ ] `user` - User accounts
- [ ] `space` - Spaces/communities
- [ ] `organization` - Organizations
- [ ] `profile` - User profiles
- [ ] `authorization_policy` - Authorization rules
- [ ] `credential` - User credentials
- [ ] `reference` - References/links
- [ ] `tagset` - Tags and classifications
- [ ] `callout` - Callouts/content
- [ ] `post` - Posts and discussions
- [ ] `comment` - Comments
- [ ] `activity_log` - Activity logs
- [ ] `room` - Communication rooms
- [ ] `notification` - Notifications

### Foreign Key Integrity

- [ ] Verify all foreign key constraints are satisfied
- [ ] Check for orphaned records (no FK violations)
- [ ] Sample check: User → Profile relationship
- [ ] Sample check: Space → Community relationship
- [ ] Sample check: Post → Callout relationship

**Sample Query (check for orphaned users):**
```sql
SELECT COUNT(*) as orphaned_users
FROM "user" u 
LEFT JOIN profile p ON u."profileId" = p.id 
WHERE p.id IS NULL;
-- Expected: 0
```

### Data Sampling

Manually verify a sample of records from key tables:

- [ ] Verify 10 random user records (UUIDs, emails, names)
- [ ] Verify 5 random space records (names, visibility, settings)
- [ ] Check text content is intact (no encoding issues)
- [ ] Verify timestamps are correctly converted (compare specific records)
- [ ] Check JSON/JSONB fields are valid and parseable
- [ ] Verify boolean fields are correct (enabled/verified flags)

## Phase 2: Kratos Identity Verification

### Kratos Database Tables

- [ ] Verify `identities` table exists and has records
- [ ] Verify `identity_credentials` table exists
- [ ] Verify `sessions` table exists
- [ ] Check row counts match source database

**Verification Query:**
```sql
-- Check identity count
SELECT COUNT(*) FROM identities;

-- Check credentials count
SELECT COUNT(*) FROM identity_credentials;

-- Verify identity-credential relationship
SELECT COUNT(*) FROM identities i
LEFT JOIN identity_credentials ic ON i.id = ic.identity_id
WHERE ic.id IS NULL;
-- Expected: 0 (no identities without credentials)
```

### Kratos Functionality

- [ ] Kratos health endpoint responds: `curl http://localhost:4434/health/ready`
- [ ] Identity records have valid UUIDs
- [ ] Credentials are properly linked to identities
- [ ] Recovery addresses are migrated
- [ ] Verifiable addresses are migrated

## Phase 3: Authentication & Authorization

### Authentication Flows

- [ ] Users can log in with existing credentials
- [ ] Password validation works correctly
- [ ] Session creation works
- [ ] Session validation works
- [ ] Logout functionality works
- [ ] Cookie management works correctly

**Test Accounts:**
- [ ] Test with at least 3 different user accounts
- [ ] Test with different roles (admin, regular user, guest)
- [ ] Verify error messages for invalid credentials

### Authorization Checks

- [ ] Authorization policies are enforced
- [ ] Role-based access control functions correctly
- [ ] Space-level permissions work
- [ ] Organization-level permissions work
- [ ] Content access controls function
- [ ] Admin operations require proper credentials

**Sample Scenarios:**
- [ ] Non-member cannot access private space
- [ ] Member can access space content
- [ ] Admin can perform administrative actions
- [ ] Guest has read-only access where configured

## Phase 4: Core Features

### GraphQL API

- [ ] GraphQL endpoint responds: `http://localhost:3000/graphql`
- [ ] GraphQL Playground loads: `http://localhost:3000/graphiql`
- [ ] Basic queries execute without errors
- [ ] Mutations execute without errors
- [ ] Subscriptions work (if enabled)

**Test Queries:**
```graphql
# Platform configuration
query {
  platform {
    configuration {
      authentication {
        enabled
      }
    }
  }
}

# List spaces
query {
  spaces {
    id
    nameID
    profile {
      displayName
    }
  }
}
```

### Space Functionality

- [ ] Can list all spaces
- [ ] Can access individual space details
- [ ] Space profiles load correctly
- [ ] Community members are listed
- [ ] Space settings are preserved
- [ ] Subspaces relationship intact (if applicable)

### Content Management

- [ ] Can view callouts
- [ ] Can create new callouts
- [ ] Can edit existing callouts
- [ ] Can view posts
- [ ] Can create new posts
- [ ] Can add comments
- [ ] Can edit content
- [ ] Can delete content (with proper permissions)

### User Profiles

- [ ] User profiles load and display correctly
- [ ] Profile avatars/images display
- [ ] User preferences are preserved
- [ ] Organization memberships show correctly
- [ ] Space memberships show correctly

### Search Functionality

- [ ] Search by space name works
- [ ] Search by user name works
- [ ] Search by content works
- [ ] Search results are relevant
- [ ] Pagination works correctly

### File Operations

- [ ] File uploads work
- [ ] File downloads work
- [ ] File storage references are intact
- [ ] Document associations are preserved

### Notifications

- [ ] Notifications are delivered
- [ ] Notification preferences are preserved
- [ ] Email notifications work (if enabled)
- [ ] In-app notifications display

## Phase 5: Performance Verification

### Database Performance

- [ ] Query response times are acceptable (baseline comparison)
- [ ] No performance degradation compared to MySQL
- [ ] Indexes are properly created
- [ ] Query plans are optimal

**Sample Performance Checks:**
```sql
-- Check for missing indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Sample query performance
EXPLAIN ANALYZE 
SELECT * FROM "user" WHERE email = 'test@example.com';
-- Compare execution time to baseline
```

### Connection Pool

- [ ] Database connections are stable
- [ ] No connection pool exhaustion
- [ ] Connection timeout settings appropriate
- [ ] Connection leak detection shows no leaks

### Application Metrics

- [ ] API response times within acceptable range
- [ ] Error rates not elevated
- [ ] Memory usage stable
- [ ] CPU usage normal
- [ ] No unusual log entries

**Monitoring Checks:**
- [ ] Check application logs for errors
- [ ] Monitor for 5-10 minutes under normal load
- [ ] Verify no performance degradation over time

## Phase 6: Data Relationship Integrity

### Relationship Verification

- [ ] User-Space memberships intact
- [ ] Organization hierarchies correct
- [ ] Content ownership preserved
- [ ] Comments linked to correct posts
- [ ] Tags and references maintained
- [ ] Callout-Post relationships correct
- [ ] Profile-Visual relationships intact

### Sample Data Checks

Pick 5 random entities and verify their relationships:

- [ ] User → Spaces → Content chain
- [ ] Organization → Members → Roles
- [ ] Space → Callouts → Posts → Comments
- [ ] Profile → References → Tags
- [ ] Authorization Policy → Roles → Users

## Phase 7: Edge Cases

### Special Characters and Encoding

- [ ] Unicode characters display correctly
- [ ] Emoji in content preserved
- [ ] Special characters in names/descriptions
- [ ] Multi-language content intact

### Null Values

- [ ] Optional fields with NULL values handled correctly
- [ ] Empty strings vs NULL distinguished properly
- [ ] Nullable foreign keys work correctly

### Large Objects

- [ ] Large text fields intact
- [ ] Large JSON objects parse correctly
- [ ] Binary data (if any) transferred correctly

## Phase 8: Rollback Readiness

### Backup Verification

- [ ] MySQL backup exists and is accessible
- [ ] Backup includes all databases (Alkemio + Kratos)
- [ ] Backup is tested and can be restored
- [ ] Backup timestamp is documented

### Rollback Procedure

- [ ] Rollback steps documented
- [ ] Configuration changes reversible
- [ ] Services can be stopped cleanly
- [ ] MySQL can be restarted from backup
- [ ] Estimated rollback time documented

## Phase 9: Documentation

### Migration Documentation

- [ ] Migration start time recorded
- [ ] Migration end time recorded
- [ ] CSV export directories documented
- [ ] Import logs saved and reviewed
- [ ] Any issues/warnings documented
- [ ] Decisions made during migration recorded

### Post-Migration Notes

- [ ] Performance observations noted
- [ ] Any differences from MySQL documented
- [ ] Optimization opportunities identified
- [ ] Lessons learned captured

## Final Sign-Off

### Approval Checklist

- [ ] All critical data verified
- [ ] All critical functionality tested
- [ ] Performance acceptable
- [ ] No critical errors in logs
- [ ] Rollback plan confirmed
- [ ] Stakeholders notified

### Decision

- [ ] **APPROVED**: Proceed with PostgreSQL
- [ ] **ROLLBACK**: Return to MySQL (document reason)

**Approved by:** _________________  
**Date:** _________________  
**Signature:** _________________  

### Post-Migration Monitoring

After approval, continue monitoring for:

- First 24 hours: Active monitoring, check every 2 hours
- First week: Daily checks
- First month: Weekly checks

**Monitor for:**
- Performance degradation
- Error rate changes
- User-reported issues
- Data inconsistencies
- System stability
