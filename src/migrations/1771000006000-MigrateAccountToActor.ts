import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateAccountToActor1771000006000 implements MigrationInterface {
  name = 'MigrateAccountToActor1771000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate Account data to Actor table
    // Account.id becomes Actor.id (direct identity)
    // Account does NOT have a profile, so profileId = NULL
    // Account has authorization from AuthorizableEntity
    await queryRunner.query(`
      INSERT INTO "actor" ("id", "createdDate", "updatedDate", "version", "type", "profileId", "authorizationId")
      SELECT
        a."id",
        a."createdDate",
        a."updatedDate",
        a."version",
        'account'::"actor_type_enum",
        NULL,
        a."authorizationId"
      FROM "account" a
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Account actors from Actor table
    await queryRunner.query(`
      DELETE FROM "actor" WHERE "type" = 'account'
    `);
  }
}
