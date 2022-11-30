import { compressText, decompressText } from '@common/utils/compression.util';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvasValueCompression1669704943113 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string; value: string }[] = await queryRunner.query(
      `SELECT id, value FROM canvas`
    );

    for (const canvas of canvases) {
      const compressedValue = await compressText(canvas.value);
      await queryRunner.query('UPDATE canvas SET value = ? WHERE id = ?', [
        compressedValue,
        canvas.id,
      ]);
    }

    const canvasTemplates: { id: string; value: string }[] =
      await queryRunner.query(`SELECT id, value FROM canvas_template`);

    for (const template of canvasTemplates) {
      const compressedValue = await compressText(template.value);
      await queryRunner.query(
        'UPDATE canvas_template SET value = ? WHERE id = ?',
        [compressedValue, template.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string; value: string }[] = await queryRunner.query(
      `SELECT id, value FROM canvas`
    );

    for (const canvas of canvases) {
      const decompressedValue = await decompressText(canvas.value);
      await queryRunner.query('UPDATE canvas SET value = ? WHERE id = ?', [
        decompressedValue,
        canvas.id,
      ]);
    }

    const canvasTemplates: { id: string; value: string }[] =
      await queryRunner.query(`SELECT id, value FROM canvas_template`);

    for (const template of canvasTemplates) {
      const decompressedValue = await decompressText(template.value);
      await queryRunner.query(
        'UPDATE canvas_template SET value = ? WHERE id = ?',
        [decompressedValue, template.id]
      );
    }
  }
}
