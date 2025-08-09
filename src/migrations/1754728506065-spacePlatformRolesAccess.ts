import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpacePlatformRolesAccess1754728506065
  implements MigrationInterface
{
  name = 'SpacePlatformRolesAccess1754728506065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`platformRolesAccess\` json NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`platformRolesAccess\``
    );
  }
}
