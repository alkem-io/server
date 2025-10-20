import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhiteboardsPreviewSettings1760960016267
  implements MigrationInterface
{
  name = 'WhiteboardsPreviewSettings1760960016267';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD \`previewSettings\` json NOT NULL`
    );
    await queryRunner.query(
      `UPDATE \`whiteboard\` SET \`previewSettings\` =
        '{"mode":"auto","coordinates":null}' WHERE \`previewSettings\` IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP COLUMN \`previewSettings\``
    );
  }
}
