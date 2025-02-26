import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProfileTypeTypo1740492712821 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE profile SET type = 'knowledge-base' WHERE type = 'kowledge-base'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration needed');
  }
}
