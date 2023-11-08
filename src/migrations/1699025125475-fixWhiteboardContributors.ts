import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixWhiteboardContributors1699025125475
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE whiteboard_rt SET contentUpdatePolicy = \'contributors\' WHERE contentUpdatePolicy = \'owner-contributors\'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Not a reversible migration!');
  }
}
