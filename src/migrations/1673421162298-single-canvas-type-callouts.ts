import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { compressText } from '@common/utils/compression.util';

const templateVisual = {
  name: 'bannerNarrow',
  minWidth: 384,
  maxWidth: 768,
  minHeight: 128,
  maxHeight: 256,
  aspectRatio: 3,
};

const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

export class singleCanvasTypeCallouts1673421162298
  implements MigrationInterface
{
  name = 'singleCanvasTypeCallouts1673421162298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`canvasTemplateId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_c506eee0b7d06523b2953d0733\` (\`canvasTemplateId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c506eee0b7d06523b2953d0733\` ON \`callout\` (\`canvasTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_c506eee0b7d06523b2953d07337\` FOREIGN KEY (\`canvasTemplateId\`) REFERENCES \`canvas_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    const canvasCallouts: { id: string }[] = await queryRunner.query(
      `SELECT id FROM callout WHERE type = 'canvas'`
    );

    const compressedEmptyValue = await compressText(emptyCanvasValue);

    for (const callout of canvasCallouts) {
      const tagsetId = randomUUID();
      const visualId = randomUUID();
      const visualAuthID = randomUUID();
      const templateInfoId = randomUUID();
      const canvasTemplateId = randomUUID();

      await queryRunner.query(`
        INSERT INTO tagset (id, version, tags)
        VALUES ('${tagsetId}', 1, '')
      `);

      await queryRunner.query(
        `INSERT INTO authorization_policy VALUES ('${visualAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO visual (id, createdDate, updatedDate, version, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
        VALUES ('${visualId}', NOW(), NOW(), 1, '${visualAuthID}', '${templateVisual.name}', '', '${templateVisual.minWidth}', '${templateVisual.maxWidth}', '${templateVisual.minHeight}', '${templateVisual.maxHeight}', '${templateVisual.aspectRatio}', '${allowedTypes}')`
      );

      await queryRunner.query(`
        INSERT INTO template_info (id, version, title, description, tagsetId, visualId)
        VALUES ('${templateInfoId}', 1, '', '', '${tagsetId}', '${visualId}')
      `);

      await queryRunner.query(
        `
        INSERT INTO canvas_template (id, version, templateInfoId, value)
        VALUES ('${canvasTemplateId}', 1, '${templateInfoId}', ?)
       `,
        [compressedEmptyValue]
      );

      await queryRunner.query(`
        UPDATE callout SET canvasTemplateId = '${canvasTemplateId}'
        WHERE callout.id = '${callout.id}'
       `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const canvasCallouts: { canvasTemplateId: string }[] =
      await queryRunner.query(
        `SELECT canvasTemplateId FROM callout WHERE type = 'canvas' AND canvasTemplateId IS NOT NULL`
      );

    const canvasTemplatesIds = canvasCallouts
      .map(x => `'${x.canvasTemplateId}'`)
      .join(',');

    await queryRunner.query(
      `DELETE FROM canvas_template WHERE id in (${canvasTemplatesIds})`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\`  DROP FOREIGN KEY \`FK_c506eee0b7d06523b2953d07337\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c506eee0b7d06523b2953d0733\` ON \`callout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_c506eee0b7d06523b2953d0733\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`canvasTemplateId\``
    );
  }
}

const emptyCanvasValue = `{\n  \"type\": \"excalidraw\",\n  \"version\": 2,\n  \"source\": \"\",\n  \"elements\": [],\n  \"appState\": {\n    \"gridSize\": 20,\n    \"viewBackgroundColor\": \"#ffffff\"\n  },\n  \"files\": {}\n}`;
