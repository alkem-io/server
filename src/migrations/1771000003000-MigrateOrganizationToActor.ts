import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateOrganizationToActor1771000003000
  implements MigrationInterface
{
  name = 'MigrateOrganizationToActor1771000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate Organization data to Actor table
    // Organization.id becomes Actor.id (direct identity)
    // Organization has profile from NameableEntity inheritance
    // Organization has authorization from AuthorizableEntity inheritance
    await queryRunner.query(`
      INSERT INTO "actor" ("id", "createdDate", "updatedDate", "version", "type", "profileId", "authorizationId")
      SELECT
        o."id",
        o."createdDate",
        o."updatedDate",
        o."version",
        'organization'::"actor_type_enum",
        o."profileId",
        o."authorizationId"
      FROM "organization" o
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Organization actors from Actor table
    await queryRunner.query(`
      DELETE FROM "actor" WHERE "type" = 'organization'
    `);
  }
}
