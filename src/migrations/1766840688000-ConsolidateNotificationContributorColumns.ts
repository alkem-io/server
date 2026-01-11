import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateNotificationContributorColumns1766840688000
  implements MigrationInterface
{
  name = 'ConsolidateNotificationContributorColumns1766840688000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FR-022 Verification: Confirm sparse columns are mutually exclusive
    // Check that no row has more than one of the three columns populated
    const multipleContributorsCheck = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE (
        (CASE WHEN "contributorUserID" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "contributorOrganizationID" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "contributorVcID" IS NOT NULL THEN 1 ELSE 0 END)
      ) > 1
    `);

    if (
      multipleContributorsCheck[0] &&
      parseInt(multipleContributorsCheck[0].count) > 0
    ) {
      throw new Error(
        `FR-022 Verification failed: Found ${multipleContributorsCheck[0].count} rows with multiple contributor columns populated. Migration cannot proceed.`
      );
    }

    // Count non-null values before consolidation
    const beforeCount = await queryRunner.query(`
      SELECT
        COUNT(*) FILTER (WHERE "contributorUserID" IS NOT NULL) as user_count,
        COUNT(*) FILTER (WHERE "contributorOrganizationID" IS NOT NULL) as org_count,
        COUNT(*) FILTER (WHERE "contributorVcID" IS NOT NULL) as vc_count,
        COUNT(*) FILTER (WHERE "contributorUserID" IS NOT NULL OR "contributorOrganizationID" IS NOT NULL OR "contributorVcID" IS NOT NULL) as total_count
      FROM "in_app_notification"
    `);
    console.log(
      `[Migration] Before consolidation: Users=${beforeCount[0].user_count}, Orgs=${beforeCount[0].org_count}, VCs=${beforeCount[0].vc_count}, Total=${beforeCount[0].total_count}`
    );

    // Step 1: Add new contributorActorId column
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      ADD COLUMN "contributorActorId" uuid
    `);

    // Step 2: Migrate data - COALESCE will pick the first non-null value
    // Since only one of the three can ever be set, this correctly consolidates
    await queryRunner.query(`
      UPDATE "in_app_notification"
      SET "contributorActorId" = COALESCE(
        "contributorUserID",
        "contributorOrganizationID",
        "contributorVcID"
      )
    `);

    // Verify count after consolidation
    const afterCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM "in_app_notification"
      WHERE "contributorActorId" IS NOT NULL
    `);
    console.log(
      `[Migration] After consolidation: Total=${afterCount[0].count}`
    );

    if (beforeCount[0].total_count !== afterCount[0].count) {
      console.warn(
        `[Migration] WARNING: Count mismatch! Before=${beforeCount[0].total_count}, After=${afterCount[0].count}`
      );
    }

    // Step 3: Add FK constraint to actor table
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      ADD CONSTRAINT "FK_notification_contributor_actor"
      FOREIGN KEY ("contributorActorId") REFERENCES "actor"("id")
      ON DELETE SET NULL
    `);

    // Step 4: Create index on contributorActorId
    await queryRunner.query(`
      CREATE INDEX "IDX_in_app_notification_contributorActorId"
      ON "in_app_notification" ("contributorActorId")
    `);

    // Step 5: Drop old sparse columns (FKs are dropped implicitly when columns are dropped)
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      DROP COLUMN "contributorUserID"
    `);
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      DROP COLUMN "contributorOrganizationID"
    `);
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      DROP COLUMN "contributorVcID"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Re-add the sparse columns
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      ADD COLUMN "contributorUserID" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      ADD COLUMN "contributorOrganizationID" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      ADD COLUMN "contributorVcID" uuid
    `);

    // Step 2: Migrate data back based on actor type
    // User actors
    await queryRunner.query(`
      UPDATE "in_app_notification" n
      SET "contributorUserID" = n."contributorActorId"
      FROM "actor" a
      WHERE n."contributorActorId" = a."id"
        AND a."type" = 'user'
    `);

    // Organization actors
    await queryRunner.query(`
      UPDATE "in_app_notification" n
      SET "contributorOrganizationID" = n."contributorActorId"
      FROM "actor" a
      WHERE n."contributorActorId" = a."id"
        AND a."type" = 'organization'
    `);

    // VirtualContributor actors
    await queryRunner.query(`
      UPDATE "in_app_notification" n
      SET "contributorVcID" = n."contributorActorId"
      FROM "actor" a
      WHERE n."contributorActorId" = a."id"
        AND a."type" = 'virtual'
    `);

    // Step 3: Drop index and FK constraint
    await queryRunner.query(`
      DROP INDEX "IDX_in_app_notification_contributorActorId"
    `);
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      DROP CONSTRAINT "FK_notification_contributor_actor"
    `);

    // Step 4: Drop contributorActorId column
    await queryRunner.query(`
      ALTER TABLE "in_app_notification"
      DROP COLUMN "contributorActorId"
    `);
  }
}
