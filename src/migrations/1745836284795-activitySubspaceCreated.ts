import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivitySubspaceCreated1745836284795
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE activity
        SET type = 'subspace-created'
        WHERE type IN ('challenge-created', 'opportunity-created');
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
