import { compressText, decompressText } from '@common/utils/compression.util';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardsValueMigration1683791393534
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string; value: string }[] = await queryRunner.query(
      `SELECT id, value from canvas`
    );

    for (const canvas of canvases) {
      const decompressedValue = await decompressText(canvas.value);
      const canvasValue = JSON.parse(decompressedValue);
      for (const element of canvasValue.elements) {
        if (element.type === 'text' && !element.originalText) {
          element.originalText = element.text;
        }
      }
      const compressedValue = await compressText(JSON.stringify(canvasValue));
      await queryRunner.query('UPDATE canvas SET value = ? WHERE id = ?', [
        compressedValue,
        canvas.id,
      ]);
    }

    const whiteboardTemplates: { id: string; value: string }[] =
      await queryRunner.query(`SELECT id, value from whiteboard_template`);

    for (const template of whiteboardTemplates) {
      const decompressedValue = await decompressText(template.value);
      const templateValue = JSON.parse(decompressedValue);
      for (const element of templateValue.elements) {
        if (element.type === 'text' && !element.originalText) {
          element.originalText = element.text;
        }
      }
      const compressedValue = await compressText(JSON.stringify(templateValue));
      await queryRunner.query(
        'UPDATE whiteboard_template SET value = ? WHERE id = ?',
        [compressedValue, template.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
