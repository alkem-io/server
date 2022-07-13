import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const table = `canvas`;
const column = `previewID`;

export class canvasVisual1657204514370 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${table} ADD ${column} char(36)`);

    // Add in Visual with Authorization for all canvases
    const canvases: any[] = await queryRunner.query(`SELECT id from ${table}`);
    for (const canvas of canvases) {
      const visualID = randomUUID();
      const visualAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${visualAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO visual (id, createdDate, updatedDate, version, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
      VALUES ('${visualID}', NOW(), NOW(), 1, '${visualAuthID}', '${templateVisual.name}', '', '${templateVisual.minWidth}', '${templateVisual.maxWidth}', '${templateVisual.minHeight}', '${templateVisual.maxHeight}', '${templateVisual.aspectRatio}', '${allowedTypes}')`
      );
      await queryRunner.query(
        `UPDATE ${table} SET ${column}='${visualID}' WHERE id='${canvas.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const templateVisual = {
  name: 'bannerNarrow',
  minWidth: 384,
  maxWidth: 768,
  minHeight: 128,
  maxHeight: 256,
  aspectRatio: 3,
};
