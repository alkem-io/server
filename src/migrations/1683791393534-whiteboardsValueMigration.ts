import { compressText, decompressText } from '@common/utils/compression.util';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardsValueMigration1683791393534
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string }[] = await queryRunner.query(
      `SELECT id from canvas`
    );

    for (const canvas of canvases) {
      const canvasCompressedValue: { value: string }[] = await queryRunner.query(
        'SELECT value from canvas where id = ?', [canvas.id]
      );

      if(!canvasCompressedValue[0].value) continue;

      const decompressedValue = await decompressText(canvasCompressedValue[0].value);

      let canvasValue;
      try {
        canvasValue = JSON.parse(decompressedValue);
      } catch (error) {
        continue;
      }

      for (const element of canvasValue.elements) {
        if (element.type === 'text') {
          if (element.originalText === undefined)
            element.originalText = element.text;
          if (element.containerId === undefined) element.containerId = null;
          if (element.locked === undefined) element.locked = null;
        }
      }
      const compressedValue = await compressText(JSON.stringify(canvasValue));
      await queryRunner.query('UPDATE canvas SET value = ? WHERE id = ?', [
        compressedValue,
        canvas.id,
      ]);
    }

    const whiteboardTemplates: { id: string }[] = await queryRunner.query(
      `SELECT id from whiteboard_template`
    );

    for (const template of whiteboardTemplates) {
      const whiteboardCompressedValue: { value: string }[] = await queryRunner.query(
        'SELECT value from whiteboard_template where id = ?', [template.id]
      );
      const decompressedValue = await decompressText(whiteboardCompressedValue[0].value);
      let templateValue;
      try {
        templateValue = JSON.parse(decompressedValue);
      } catch (error) {
        continue;
      }
      if(!templateValue.elements) continue;

      for (const element of templateValue.elements) {
        if (element.type === 'text') {
          if (element.originalText === undefined)
            element.originalText = element.text;
          if (element.containerId === undefined) element.containerId = null;
          if (element.locked === undefined) element.locked = null;
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
