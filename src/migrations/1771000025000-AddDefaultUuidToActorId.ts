import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultUuidToActorId1771000025000
  implements MigrationInterface
{
  name = 'AddDefaultUuidToActorId1771000025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CTI child entity inserts use DEFAULT for the parent table's id column.
    // The actor table was originally created without a DEFAULT on id because
    // the old composition pattern generated UUIDs in application code.
    // With CTI, TypeORM expects the DB to generate the UUID.
    await queryRunner.query(
      `ALTER TABLE "actor" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "actor" ALTER COLUMN "id" DROP DEFAULT`
    );
  }
}
