import { MigrationInterface, QueryRunner } from 'typeorm';

export class aspectTypeDescription1649321093803 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aspect\` RENAME COLUMN \`description\` TO \`defaultDescription\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`typeDescription\` text NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`typeDescription\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` RENAME COLUMN \`defaultDescription\` TO \`description\``
    );
  }
}
