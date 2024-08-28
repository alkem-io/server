import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgSpaceVClicense1724832530050 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`license_plan\` SET \`assignToNewOrganizationAccounts\` = 1 WHERE \`licenseCredential\` = 'feature-virtual-contributors'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`license_plan\` SET \`assignToNewOrganizationAccounts\` = 0 WHERE \`licenseCredential\` = 'feature-virtual-contributors'`
    );
  }
}
