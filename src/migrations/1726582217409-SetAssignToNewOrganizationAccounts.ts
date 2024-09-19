import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetAssignToNewOrganizationAccounts1726582217409
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE \`license_plan\`
          SET assignToNewOrganizationAccounts = true
          WHERE name = 'SPACE_FEATURE_VIRTUAL_CONTIBUTORS';
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE \`license_plan\`
          SET assignToNewOrganizationAccounts = false
          WHERE name = 'SPACE_FEATURE_VIRTUAL_CONTIBUTORS';
      `);
  }
}
