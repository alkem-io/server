import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cleanup migration for orphaned conversation_direct rooms.
 *
 * Background:
 * Migration 1764897584127-conversationArchitectureRefactor had a bug in Step 2B
 * that left 28 orphaned `conversation_direct` rooms in the database.
 *
 * The bug was a race condition in CTE-based deletion:
 * - The migration first deleted duplicate conversations (rn=2)
 * - Then tried to delete duplicate rooms using the same CTE pattern
 * - But the CTE JOIN (conversation c JOIN room r ON c."roomId" = r.id)
 *   couldn't find the rooms because the referencing conversations were already deleted
 *
 * Result: 28 rooms exist with type='conversation_direct' but no conversation
 * references them (conversation.roomId).
 *
 * This migration safely removes those orphaned room records.
 * The corresponding Matrix rooms should NOT be deleted as they are shared
 * with the "linked" twin rooms that still have valid conversations.
 *
 * See: https://github.com/alkem-io/server/issues/5796
 */
export class CleanupOrphanedConversationRooms1769181627991
  implements MigrationInterface
{
  name = 'CleanupOrphanedConversationRooms1769181627991';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Count orphaned rooms before deletion
    const orphanedCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM room r
      WHERE r.type = 'conversation_direct'
        AND NOT EXISTS (
          SELECT 1 FROM conversation c WHERE c."roomId" = r.id
        )
    `);
    console.log(
      `[Migration] Found ${orphanedCount[0]?.count ?? 0} orphaned conversation_direct rooms`
    );

    // Delete orphaned conversation_direct rooms
    const deleteResult = await queryRunner.query(`
      DELETE FROM room
      WHERE type = 'conversation_direct'
        AND NOT EXISTS (
          SELECT 1 FROM conversation c WHERE c."roomId" = room.id
        )
    `);
    console.log(
      `[Migration] Deleted ${deleteResult[1] ?? 0} orphaned conversation_direct rooms`
    );

    // Verify cleanup
    const remainingOrphans = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM room r
      WHERE r.type = 'conversation_direct'
        AND NOT EXISTS (
          SELECT 1 FROM conversation c WHERE c."roomId" = r.id
        )
    `);
    if (remainingOrphans[0]?.count > 0) {
      console.warn(
        `[Migration] WARNING: ${remainingOrphans[0].count} orphaned rooms still remain`
      );
    } else {
      console.log(
        `[Migration] Cleanup complete - no orphaned conversation_direct rooms remain`
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration cannot be reverted as the deleted room data cannot be restored.
    // The orphaned rooms were database artifacts from a previous migration bug
    // and contained no unique data (messages were in shared Matrix rooms).
    console.warn(
      '[Migration] CleanupOrphanedConversationRooms1769181627991 cannot be reverted - orphaned room data was not preserved'
    );
  }
}
