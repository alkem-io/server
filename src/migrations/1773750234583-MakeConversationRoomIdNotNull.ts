import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeConversationRoomIdNotNull1773750234583
  implements MigrationInterface
{
  name = 'MakeConversationRoomIdNotNull1773750234583';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: delete any orphaned conversations that have no room
    // (should be zero after previous migration waves, but be safe)
    await queryRunner.query(
      `DELETE FROM "conversation" WHERE "roomId" IS NULL`
    );

    // Make roomId NOT NULL to match the non-nullable schema contract
    await queryRunner.query(
      `ALTER TABLE "conversation" ALTER COLUMN "roomId" SET NOT NULL`
    );

    // Change FK from SET NULL to CASCADE (SET NULL is incompatible with NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_c3eb45de493217a6d0e225028fa"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_c3eb45de493217a6d0e225028fa" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore FK to SET NULL
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP CONSTRAINT "FK_c3eb45de493217a6d0e225028fa"`
    );
    await queryRunner.query(
      `ALTER TABLE "conversation" ADD CONSTRAINT "FK_c3eb45de493217a6d0e225028fa" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "conversation" ALTER COLUMN "roomId" DROP NOT NULL`
    );
  }
}
