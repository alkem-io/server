import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePushSubscriptionTable1772396107069
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscription" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        "endpoint" varchar(2048) NOT NULL,
        "p256dh" varchar(512) NOT NULL,
        "auth" varchar(512) NOT NULL,
        "status" varchar(128) NOT NULL DEFAULT 'active',
        "userAgent" varchar(512),
        "lastActiveDate" TIMESTAMP,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_push_subscription" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_subscription_userId" FOREIGN KEY ("userId")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_push_subscription_userId_status"
        ON "push_subscription" ("userId", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_push_subscription_endpoint"
        ON "push_subscription" ("endpoint")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_push_subscription_endpoint"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_push_subscription_userId_status"`
    );
    await queryRunner.query(`DROP TABLE "push_subscription"`);
  }
}
