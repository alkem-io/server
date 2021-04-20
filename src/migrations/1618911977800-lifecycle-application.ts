import { MigrationInterface, QueryRunner } from 'typeorm';

export class lifecycleApplication1618911977800 implements MigrationInterface {
  name = 'lifecycleApplication1618911977800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `lifecycle` DROP COLUMN `actionsType`'
    );
    await queryRunner.query('ALTER TABLE `application` DROP COLUMN `status`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `application` ADD `status` int NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `lifecycle` ADD `actionsType` varchar(255) NOT NULL'
    );
  }
}
