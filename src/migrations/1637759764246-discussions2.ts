import { MigrationInterface, QueryRunner } from 'typeorm';

export class discussions21637759764246 implements MigrationInterface {
  name = 'discussions21637759764246';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`description\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`commentsCount\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`createdBy\` char(36) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`createdBy\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`commentsCount\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`description\``
    );
  }
}
