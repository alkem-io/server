import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationUnreadTracking1768225755841
  implements MigrationInterface
{
  name = 'AddConversationUnreadTracking1768225755841';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "room" ADD "lastMessageAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" ADD "lastReadAt" TIMESTAMP`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_membership" DROP COLUMN "lastReadAt"`
    );
    await queryRunner.query(`ALTER TABLE "room" DROP COLUMN "lastMessageAt"`);
  }
}
