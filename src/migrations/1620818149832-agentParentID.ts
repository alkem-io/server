import { MigrationInterface, QueryRunner } from 'typeorm';

export class agentParentID1620818149832 implements MigrationInterface {
  name = 'agentParentID1620818149832';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `agent` ADD `parentDisplayID` text NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `agent` DROP COLUMN `parentDisplayID`'
    );
  }
}
