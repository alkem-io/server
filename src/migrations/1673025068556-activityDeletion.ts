import { MigrationInterface, QueryRunner } from 'typeorm';

export class activityDeletion1673025068556 implements MigrationInterface {
  name = 'activityDeletion1673025068556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`messageID\` char(44) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` ADD \`visibility\` boolean DEFAULT TRUE `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP COLUMN \`messageID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`activity\` DROP COLUMN \`visibility\``
    );
  }
}
