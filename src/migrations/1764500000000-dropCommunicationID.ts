import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCommunicationID1764500000000 implements MigrationInterface {
  name = 'DropCommunicationID1764500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop communicationID from user table
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `communicationID`');

    // Drop communicationID from virtual_contributor table
    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` DROP COLUMN `communicationID`'
    );

    // Drop communicationID from organization table
    await queryRunner.query(
      'ALTER TABLE `organization` DROP COLUMN `communicationID`'
    );

    // Drop externalRoomID from room table (now using room.id directly)
    await queryRunner.query(
      'ALTER TABLE `room` DROP COLUMN `externalRoomID`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add communicationID to user table
    await queryRunner.query(
      "ALTER TABLE `user` ADD `communicationID` varchar(255) NOT NULL DEFAULT ''"
    );

    // Re-add communicationID to virtual_contributor table
    await queryRunner.query(
      "ALTER TABLE `virtual_contributor` ADD `communicationID` varchar(255) NOT NULL DEFAULT ''"
    );

    // Re-add communicationID to organization table
    await queryRunner.query(
      "ALTER TABLE `organization` ADD `communicationID` varchar(255) NOT NULL DEFAULT ''"
    );

    // Re-add externalRoomID to room table
    await queryRunner.query(
      "ALTER TABLE `room` ADD `externalRoomID` varchar(255) NOT NULL DEFAULT ''"
    );
  }
}
