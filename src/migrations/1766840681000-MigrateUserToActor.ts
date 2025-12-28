import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserToActor1766840681000 implements MigrationInterface {
  name = 'MigrateUserToActor1766840681000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate User data to Actor table
    // User.id becomes Actor.id (direct identity)
    // User has profile from NameableEntity inheritance
    // User has authorization from AuthorizableEntity inheritance
    await queryRunner.query(`
      INSERT INTO "actor" ("id", "createdDate", "updatedDate", "version", "type", "profileId", "authorizationId")
      SELECT
        u."id",
        u."createdDate",
        u."updatedDate",
        u."version",
        'user'::"actor_type_enum",
        u."profileId",
        u."authorizationId"
      FROM "user" u
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove User actors from Actor table
    await queryRunner.query(`
      DELETE FROM "actor" WHERE "type" = 'user'
    `);
  }
}
