import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to drop the conversationsSetId column from the user table.
 *
 * Background:
 * - Per-user ConversationsSet has been replaced by a single platform-owned ConversationsSet
 * - All conversations now belong to this platform set
 * - User-to-conversation relationship is tracked via conversation_membership pivot table
 * - The conversationsSetId column on user is no longer needed
 *
 * Note: This migration also cleans up orphaned ConversationsSet records that were
 * previously owned by users. All conversations should already be migrated to the
 * platform set before this migration runs.
 */
export class DropUserConversationsSet1765100000000
  implements MigrationInterface
{
  name = 'DropUserConversationsSet1765100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the foreign key constraint from user to conversations_set
    // First check if the constraint exists (name may vary)
    const fkConstraints = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%conversationsSet%'
    `);

    for (const constraint of fkConstraints) {
      await queryRunner.query(
        `ALTER TABLE "user" DROP CONSTRAINT "${constraint.constraint_name}"`
      );
    }

    // 2. Drop the conversationsSetId column from user table
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user'
        AND column_name = 'conversationsSetId'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "user" DROP COLUMN "conversationsSetId"`
      );
    }

    // 3. Delete orphaned conversations_set records (those not referenced by any conversation)
    // Keep only the platform set (the one with conversations)
    await queryRunner.query(`
      DELETE FROM conversations_set
      WHERE id NOT IN (
        SELECT DISTINCT "conversationsSetId" FROM conversation WHERE "conversationsSetId" IS NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the conversationsSetId column to user table
    await queryRunner.query(
      `ALTER TABLE "user" ADD "conversationsSetId" uuid`
    );

    // Re-add the foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_user_conversationsSet" FOREIGN KEY ("conversationsSetId") REFERENCES "conversations_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Note: This down migration does not restore the data association between users and conversation sets.
    // A full restoration would require additional data migration steps if needed.
  }
}
