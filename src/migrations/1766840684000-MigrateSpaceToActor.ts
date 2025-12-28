import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateSpaceToActor1766840684000 implements MigrationInterface {
  name = 'MigrateSpaceToActor1766840684000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate Space data to Actor table
    // Space.id becomes Actor.id (direct identity)
    // Space does NOT have a profile (uses SpaceAbout instead), so profileId = NULL
    // Space has authorization from AuthorizableEntity
    await queryRunner.query(`
      INSERT INTO "actor" ("id", "createdDate", "updatedDate", "version", "type", "profileId", "authorizationId")
      SELECT
        s."id",
        s."createdDate",
        s."updatedDate",
        s."version",
        'space'::"actor_type_enum",
        NULL,
        s."authorizationId"
      FROM "space" s
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Space actors from Actor table
    await queryRunner.query(`
      DELETE FROM "actor" WHERE "type" = 'space'
    `);
  }
}
