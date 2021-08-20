import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvas1629464228000 implements MigrationInterface {
  name = 'canvas1629464228000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `canvas` MODIFY value  TEXT NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `canvas` MODIFY value VARCHAR(255)');
  }
}
