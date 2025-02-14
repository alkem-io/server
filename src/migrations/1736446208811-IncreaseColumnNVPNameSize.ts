import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseColumnNVPNameSize1736446208811
  implements MigrationInterface
{
  name = 'IncreaseColumnNVPNameSize1736446208811';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`nvp\` MODIFY COLUMN \`name\` VARCHAR(512) NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`nvp\` MODIFY COLUMN \`name\` VARCHAR(128) NOT NULL`
    );
  }
}
