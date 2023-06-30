import { MigrationInterface, QueryRunner } from 'typeorm';

export class invitationMessage1688042931818 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `invitation` ADD COLUMN `welcomeMessage` varchar(512) NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `invitation` DROP COLUMN `welcomeMessage`'
    );
  }
}
