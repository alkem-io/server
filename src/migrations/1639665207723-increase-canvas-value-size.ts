import { MigrationInterface, QueryRunner } from 'typeorm';

export class increaseCanvasValueSize1639665207723
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE canvas
      CHANGE COLUMN value value LONGTEXT NOT NULL ;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE canvas
      CHANGE COLUMN value value TEXT NOT NULL ;`
    );
  }
}
