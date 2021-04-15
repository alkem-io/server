import { MigrationInterface, QueryRunner } from 'typeorm';

export class ecoverseTxtID1618062730527 implements MigrationInterface {
  name = 'ecoverseTxtID1618062730527';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `ecoverse` ADD `textID` varchar(255) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `ecoverse` DROP COLUMN `textID`');
  }
}
