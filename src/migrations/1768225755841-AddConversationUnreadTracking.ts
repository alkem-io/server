import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationUnreadTracking1768225755841
  implements MigrationInterface
{
  name = 'AddConversationUnreadTracking1768225755841';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // rollback: ALTER TABLE "room" DROP COLUMN IF EXISTS "lastMessageAt";
    await queryRunner.query(
      `ALTER TABLE "room" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP`
    );
    // rollback: ALTER TABLE "conversation_membership" DROP COLUMN IF EXISTS "lastReadAt";
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD COLUMN IF NOT EXISTS "lastReadAt" TIMESTAMP`
    );
    // rollback: DROP INDEX IF EXISTS "IDX_room_lastMessageAt";
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_room_lastMessageAt" ON "room" ("lastMessageAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_room_lastMessageAt"`);
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP COLUMN IF EXISTS "lastReadAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "room" DROP COLUMN IF EXISTS "lastMessageAt"`
    );
  }
}
