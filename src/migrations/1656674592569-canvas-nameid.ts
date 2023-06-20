import { MigrationInterface, QueryRunner } from 'typeorm';
import { generateNameID } from './utils/generate-nameid';

export class canvasNameid1656674592569 implements MigrationInterface {
  name = 'canvasNameid1656674592569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`nameID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` RENAME COLUMN \`name\` TO \`displayName\``
    );

    const canvases: any[] = await queryRunner.query(
      `SELECT id, displayName from canvas`
    );
    for (const canvas of canvases) {
      // Set authorization on templates_set + also link to hub
      const nameID = generateNameID(canvas.displayName, true, 20);
      await queryRunner.query(
        `UPDATE canvas SET nameID = '${nameID}' WHERE (id = '${canvas.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` RENAME COLUMN \`displayName\` TO \`name\``
    );
  }
}
