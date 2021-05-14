import { MigrationInterface, QueryRunner } from 'typeorm';

export class community1620968954419 implements MigrationInterface {
  name = 'community1620968954419';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` ADD `ecoverseID` varchar(255) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `ecoverseID`');
  }
}
