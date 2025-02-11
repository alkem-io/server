import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProfileType1739270527860 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE profile SET type = 'whiteboard' WHERE type = 'whiteboard-rt'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE profile SET type = 'whiteboard-rt' WHERE type = 'whiteboard'`
    );
  }
}
