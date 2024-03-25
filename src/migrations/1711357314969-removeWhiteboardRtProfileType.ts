import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeWhiteboardRtProfileType1711357314969
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE profile SET type = 'whiteboard' WHERE type = 'whiteboard-rt'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('This migration is irreversible.');
  }
}
