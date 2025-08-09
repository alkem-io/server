import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpacePlatformRolesAccess1754728506065
  implements MigrationInterface
{
  name = 'SpacePlatformRolesAccess1754728506065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`platformRolesAccess\` json NOT NULL`
    );
    // create a default value for all existing spaces of platformRolesAccess
    await queryRunner.query(
      `UPDATE \`space\` SET \`platformRolesAccess\` = '{"roles": []}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`platformRolesAccess\``
    );
  }
}
