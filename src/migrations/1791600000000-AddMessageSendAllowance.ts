import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One row per sender holding the times of their counted messages to people,
 * for the hourly send allowance. Additive: no existing table is altered and no
 * data is written. The row is removed with its actor.
 */
export class AddMessageSendAllowance1791600000000 implements MigrationInterface {
  name = 'AddMessageSendAllowance1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "message_send_allowance" ("actorId" uuid NOT NULL, "sentAt" TIMESTAMP WITH TIME ZONE[] NOT NULL, CONSTRAINT "PK_message_send_allowance" PRIMARY KEY ("actorId"), CONSTRAINT "FK_message_send_allowance_actorId" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "message_send_allowance"`);
  }
}
