import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateVirtualContributorToActor1771000004000
  implements MigrationInterface
{
  name = 'MigrateVirtualContributorToActor1771000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate VirtualContributor data to Actor table
    // VirtualContributor.id becomes Actor.id (direct identity)
    // VirtualContributor has profile from NameableEntity inheritance
    // VirtualContributor has authorization from AuthorizableEntity inheritance
    await queryRunner.query(`
      INSERT INTO "actor" ("id", "createdDate", "updatedDate", "version", "type", "profileId", "authorizationId")
      SELECT
        vc."id",
        vc."createdDate",
        vc."updatedDate",
        vc."version",
        'virtual'::"actor_type_enum",
        vc."profileId",
        vc."authorizationId"
      FROM "virtual_contributor" vc
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove VirtualContributor actors from Actor table
    await queryRunner.query(`
      DELETE FROM "actor" WHERE "type" = 'virtual'
    `);
  }
}
