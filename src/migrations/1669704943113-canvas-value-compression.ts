import { compressText, decompressText } from '@common/utils/compression.util';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvasValueCompression1669704943113 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string; value: string }[] = await queryRunner.query(
      `SELECT id, value FROM canvas`
    );

    for (const canvas of canvases) {
      const compressedValue = await compressText(canvas.value);
      await queryRunner.query(
        `UPDATE canvas SET value = '${compressedValue}' WHERE id = '${canvas.id}'`
      );
      //   await queryRunner.query(
      //     String.raw`
      //       UPDATE canvas SET value = ' +
      //         ${String.raw`${compressedValue}`} +
      //          WHERE id = '${canvas.id}'`
      //   );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string; value: string }[] = await queryRunner.query(
      `SELECT id, value FROM canvas`
    );

    for (const canvas of canvases) {
      const decompressedValue = await decompressText(canvas.value);
      await queryRunner.query(
        `UPDATE canvas SET value = '${decompressedValue}' WHERE id = '${canvas.id}'`
      );
    }
  }
}
