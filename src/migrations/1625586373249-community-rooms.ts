import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityRooms1625586373249 implements MigrationInterface {
  name = 'communityRooms1625586373249';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `communicationRoomID`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `updatesRoomID` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `discussionRoomID` varchar(255) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `discussionRoomID`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `updatesRoomID`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `communicationRoomID` varchar(255) NOT NULL'
    );
  }
}
