import { MigrationInterface, QueryRunner } from 'typeorm';

export class lifecycle31617516469975 implements MigrationInterface {
  name = 'lifecycle31617516469975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `lifecycle` ADD `actionsType` varchar(255) NOT NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `lifecycle` DROP COLUMN `actionsType`'
    );
  }
}
