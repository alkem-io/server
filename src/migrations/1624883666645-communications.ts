import { MigrationInterface, QueryRunner } from 'typeorm';

export class communications1624883666645 implements MigrationInterface {
  name = 'communications1624883666645';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` ADD `communicationRoomID` varchar(255) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `communicationGroupID` varchar(255) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `communicationGroupID`'
    );
    await queryRunner.query(
      'ALTER TABLE `community` DROP COLUMN `communicationRoomID`'
    );
  }
}
