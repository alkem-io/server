import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropWellKnownVirtualContributorColumn1765130613747
  implements MigrationInterface
{
  name = 'DropWellKnownVirtualContributorColumn1765130613747';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP COLUMN "wellKnownVirtualContributor"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD "wellKnownVirtualContributor" character varying(128)`
    );
  }
}
