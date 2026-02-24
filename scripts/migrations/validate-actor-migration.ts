/**
 * Actor Migration Validation Script
 *
 * This script validates the integrity of the Actor transformation migration.
 * Run after migrations complete to verify data consistency.
 *
 * Usage: npx ts-node scripts/migrations/validate-actor-migration.ts
 *
 * Checks performed:
 * 1. Actor count = User + Organization + VirtualContributor + Space + Account counts
 * 2. Credential count unchanged (all credentials have actorId)
 * 3. Zero orphaned credentials (all actorIds exist in actor table)
 * 4. Zero invalid FK references (non-NULL pointing to missing actors)
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

interface ValidationResult {
  check: string;
  passed: boolean;
  details: string;
}

async function validateActorMigration(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DATABASE || 'alkemio',
  });

  await dataSource.initialize();
  const results: ValidationResult[] = [];

  try {
    // Check 1: Actor count matches sum of entity counts
    const entityCounts = await dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM "user") as user_count,
        (SELECT COUNT(*) FROM "organization") as org_count,
        (SELECT COUNT(*) FROM "virtual_contributor") as vc_count,
        (SELECT COUNT(*) FROM "space") as space_count,
        (SELECT COUNT(*) FROM "account") as account_count,
        (SELECT COUNT(*) FROM "actor") as actor_count
    `);

    const counts = entityCounts[0];
    const expectedActorCount =
      parseInt(counts.user_count) +
      parseInt(counts.org_count) +
      parseInt(counts.vc_count) +
      parseInt(counts.space_count) +
      parseInt(counts.account_count);
    const actualActorCount = parseInt(counts.actor_count);

    results.push({
      check: 'Actor count matches entity sum',
      passed: expectedActorCount === actualActorCount,
      details: `Expected: ${expectedActorCount} (Users: ${counts.user_count}, Orgs: ${counts.org_count}, VCs: ${counts.vc_count}, Spaces: ${counts.space_count}, Accounts: ${counts.account_count}), Actual: ${actualActorCount}`,
    });

    // Check 2: All credentials have actorId (no null actorId)
    const credentialCheck = await dataSource.query(`
      SELECT
        COUNT(*) as total_credentials,
        COUNT("actorId") as credentials_with_actor,
        COUNT(*) - COUNT("actorId") as credentials_without_actor
      FROM "credential"
    `);

    const credCounts = credentialCheck[0];
    results.push({
      check: 'All credentials have actorId',
      passed: parseInt(credCounts.credentials_without_actor) === 0,
      details: `Total: ${credCounts.total_credentials}, With actorId: ${credCounts.credentials_with_actor}, Without: ${credCounts.credentials_without_actor}`,
    });

    // Check 3: No orphaned credentials (all actorIds exist in actor table)
    const orphanedCredentials = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM "credential" c
      WHERE c."actorId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "actor" a WHERE a."id" = c."actorId"
        )
    `);

    results.push({
      check: 'Zero orphaned credentials',
      passed: parseInt(orphanedCredentials[0].count) === 0,
      details: `Orphaned credentials: ${orphanedCredentials[0].count}`,
    });

    // Check 4: Verify actor type distribution
    const actorTypeDistribution = await dataSource.query(`
      SELECT "type", COUNT(*) as count
      FROM "actor"
      GROUP BY "type"
      ORDER BY "type"
    `);

    const typeDetails = actorTypeDistribution
      .map((row: { type: string; count: string }) => `${row.type}: ${row.count}`)
      .join(', ');

    results.push({
      check: 'Actor type distribution',
      passed: true, // Informational
      details: typeDetails,
    });

    // Check 5: Verify conversation_membership actorId migration
    const membershipCheck = await dataSource.query(`
      SELECT
        COUNT(*) as total_memberships,
        COUNT("actorId") as memberships_with_actor
      FROM "conversation_membership"
    `);

    const memberCounts = membershipCheck[0];
    results.push({
      check: 'Conversation memberships have actorId',
      passed:
        parseInt(memberCounts.total_memberships) ===
        parseInt(memberCounts.memberships_with_actor),
      details: `Total: ${memberCounts.total_memberships}, With actorId: ${memberCounts.memberships_with_actor}`,
    });

    // Check 6: Verify in_app_notification contributorActorId migration
    const notificationCheck = await dataSource.query(`
      SELECT
        COUNT(*) as total_notifications,
        COUNT("contributorActorId") as with_contributor_actor,
        COUNT(*) FILTER (WHERE "contributorActorId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "actor" a WHERE a."id" = "contributorActorId"))
          as orphaned_contributor_refs
      FROM "in_app_notification"
    `);

    const notifCounts = notificationCheck[0];
    results.push({
      check: 'Notification contributorActorId integrity',
      passed: parseInt(notifCounts.orphaned_contributor_refs) === 0,
      details: `Total: ${notifCounts.total_notifications}, With contributorActorId: ${notifCounts.with_contributor_actor}, Orphaned refs: ${notifCounts.orphaned_contributor_refs}`,
    });

    // Check 7: Verify agent table is dropped
    const agentTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'agent'
      ) as exists
    `);

    results.push({
      check: 'Agent table dropped',
      passed: !agentTableExists[0].exists,
      details: agentTableExists[0].exists
        ? 'Agent table still exists'
        : 'Agent table successfully dropped',
    });

    // Check 8: Verify agentId columns removed from entities
    const agentIdColumnsCheck = await dataSource.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE column_name = 'agentId'
        AND table_name IN ('user', 'organization', 'virtual_contributor', 'space', 'account')
    `);

    results.push({
      check: 'AgentId columns removed from entities',
      passed: agentIdColumnsCheck.length === 0,
      details:
        agentIdColumnsCheck.length === 0
          ? 'All agentId columns removed'
          : `Found agentId in: ${agentIdColumnsCheck.map((r: { table_name: string }) => r.table_name).join(', ')}`,
    });

    // Check 9: Verify invitation.contributorType column removed
    const contributorTypeCheck = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'invitation'
        AND column_name = 'contributorType'
    `);

    results.push({
      check: 'Invitation contributorType column removed',
      passed: contributorTypeCheck.length === 0,
      details:
        contributorTypeCheck.length === 0
          ? 'contributorType column removed'
          : 'contributorType column still exists',
    });

    // Print results
    console.log('\n========================================');
    console.log('  Actor Migration Validation Results');
    console.log('========================================\n');

    let allPassed = true;
    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${result.check}`);
      console.log(`       ${result.details}\n`);
      if (!result.passed) allPassed = false;
    }

    console.log('========================================');
    if (allPassed) {
      console.log('✅ All validation checks passed!');
    } else {
      console.log('❌ Some validation checks failed. Review the details above.');
      process.exit(1);
    }
    console.log('========================================\n');
  } finally {
    await dataSource.destroy();
  }
}

validateActorMigration().catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
