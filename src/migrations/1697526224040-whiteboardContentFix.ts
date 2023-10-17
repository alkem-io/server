import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardContentFix1697526224040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `callout_contribution_defaults` CHANGE COLUMN `whiteboardContent` `whiteboardContent` longtext NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `callout_contribution_defaults` CHANGE COLUMN `whiteboardContent` `whiteboardContent` longtext NOT NULL'
    );
  }
}
