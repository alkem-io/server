import { MigrationInterface, QueryRunner } from 'typeorm';

export class authPolicyPrivilegeRule1640945390921
  implements MigrationInterface
{
  name = 'authPolicyPrivilegeRule1640945390921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` ADD \`privilegeRules\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`authorization_policy\` DROP COLUMN \`privilegeRules\``
    );
  }
}
