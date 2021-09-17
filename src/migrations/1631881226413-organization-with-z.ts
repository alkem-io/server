import { MigrationInterface, QueryRunner } from 'typeorm';

export class organizationWithZ1631881226413 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organization-owner' WHERE `type` = 'organisation-owner'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organization-admin' WHERE `type` = 'organisation-admin'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organization-member' WHERE `type` = 'organisation-member'"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organisation-owner' WHERE `type` = 'organization-owner'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organisation-admin' WHERE `type` = 'organization-admin'"
    );
    await queryRunner.query(
      "UPDATE `credential` SET `type` = 'organisation-member' WHERE `type` = 'organization-member'"
    );
  }
}
