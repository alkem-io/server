import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePushSubscription1771600000000 implements MigrationInterface {
  name = 'CreatePushSubscription1771600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "push_subscription" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userID" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" character varying(255) NOT NULL,
        "auth" character varying(255) NOT NULL,
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_push_subscription_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "PK_push_subscription_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_subscription_user" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_push_subscription_userID" ON "push_subscription" ("userID")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_push_subscription_userID"`
    );
    await queryRunner.query(`DROP TABLE "push_subscription"`);
  }
}
