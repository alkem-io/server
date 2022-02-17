import { MigrationInterface, QueryRunner } from 'typeorm';

export class ecoverseTemplates1644408398563 implements MigrationInterface {
  name = 'ecoverseTemplates1644408398563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ecoverse\` ADD \`template\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ecoverse\` DROP COLUMN \`template\``
    );
  }
}
