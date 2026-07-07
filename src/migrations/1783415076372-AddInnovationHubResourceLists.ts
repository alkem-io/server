import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#017-innovation-hub-resources
 *
 * Adds the two curated resource lists to `innovation_hub`, mirroring the
 * existing `spaceListFilter` column (TypeORM `simple-array`: a single text
 * column holding comma-joined UUIDs, no brackets; empty list = empty string).
 *
 * No backfill: Innovation Hubs that already exist keep their new
 * `innovationPackListFilter` / `virtualContributorListFilter` columns NULL —
 * empty, same as a newly created hub — so no section appears until an admin
 * curates one. Existing `spaceListFilter` values are untouched.
 */
export class AddInnovationHubResourceLists1783415076372
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD "innovationPackListFilter" text`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" ADD "virtualContributorListFilter" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP COLUMN "virtualContributorListFilter"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_hub" DROP COLUMN "innovationPackListFilter"`
    );
  }
}
