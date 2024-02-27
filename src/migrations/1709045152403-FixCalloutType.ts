import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCalloutType1709045152403 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // update all the callouts with whiteboardRT type
    await queryRunner.query(
      `UPDATE \`callout\` SET type = 'whiteboard' WHERE type = 'whiteboard_real_time'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
