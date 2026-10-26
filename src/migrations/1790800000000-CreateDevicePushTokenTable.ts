import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `device_push_token`: one row per native push token (FCM on Android, APNs on
 * iOS), bound to one user. Three feature columns and no more — `token`
 * (UNIQUE, the natural key), `platform` and `userId`.
 *
 * The UNIQUE index is created HERE under the same name
 * `device.push.token.entity.ts` declares with `@Index(...)`, and the FK under
 * the same name the entity declares on its `@JoinColumn`, so TypeORM's differ
 * matches both and the next `migration:generate` emits nothing for this table.
 *
 * No existing table is altered: strictly one CREATE TABLE plus its index.
 *
 * The `BaseAlkemioEntity` columns copy the TypeORM-GENERATED precedent at
 * 1777000000000-CreateCollaboraDocument.ts:11 (`timestamptz`, bare `version`),
 * NOT the hand-written 1772396107069-CreatePushSubscriptionTable.ts, which is
 * itself already drifted from the base entity and had to be reconciled by a
 * later generated migration.
 */
export class CreateDevicePushTokenTable1790800000000
  implements MigrationInterface
{
  name = 'CreateDevicePushTokenTable1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "device_push_token" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "token" character varying(512) NOT NULL,
        "platform" character varying(128) NOT NULL,
        "userId" uuid NOT NULL,
        PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_push_token_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_device_push_token_token" ON "device_push_token" ("token")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropping the table drops its index and FK with it. No other table was
    // touched, so there is nothing else to reverse.
    await queryRunner.query(`DROP TABLE "device_push_token"`);
  }
}
