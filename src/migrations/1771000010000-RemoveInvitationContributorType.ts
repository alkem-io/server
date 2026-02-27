import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveInvitationContributorType1771000010000
  implements MigrationInterface
{
  name = 'RemoveInvitationContributorType1771000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Store the mapping for rollback purposes (in case we need to restore)
    // This creates a backup table that maps invitedContributorID to contributorType
    await queryRunner.query(`
      CREATE TABLE "_invitation_contributor_type_backup" AS
      SELECT "id", "invitedContributorID", "contributorType"
      FROM "invitation"
    `);

    // Drop the contributorType column
    // The type can now be derived from actor.type via invitedContributorID -> actor.id
    await queryRunner.query(`
      ALTER TABLE "invitation" DROP COLUMN "contributorType"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the contributorType column
    await queryRunner.query(`
      ALTER TABLE "invitation"
      ADD COLUMN "contributorType" character varying(128)
    `);

    // Restore data from backup if available
    const backupExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '_invitation_contributor_type_backup'
      )
    `);

    if (backupExists[0]?.exists) {
      await queryRunner.query(`
        UPDATE "invitation" i
        SET "contributorType" = b."contributorType"
        FROM "_invitation_contributor_type_backup" b
        WHERE i."id" = b."id"
      `);
    } else {
      // If backup doesn't exist, derive from actor type
      await queryRunner.query(`
        UPDATE "invitation" i
        SET "contributorType" = CASE a."type"
          WHEN 'user' THEN 'user'
          WHEN 'organization' THEN 'organization'
          WHEN 'virtual-contributor' THEN 'virtual-contributor'
          ELSE 'user'
        END
        FROM "actor" a
        WHERE i."invitedContributorID" = a."id"
      `);
    }

    // Make the column NOT NULL after restoring data
    await queryRunner.query(`
      ALTER TABLE "invitation"
      ALTER COLUMN "contributorType" SET NOT NULL
    `);

    // Drop backup table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "_invitation_contributor_type_backup"
    `);
  }
}
