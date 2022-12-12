import { MigrationInterface, QueryRunner } from 'typeorm';

export class commentsCount1670843453066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`comments\` ADD \`commentsCount\` int NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`comments\` DROP COLUMN \`commentsCount\``
    );
  }
}
