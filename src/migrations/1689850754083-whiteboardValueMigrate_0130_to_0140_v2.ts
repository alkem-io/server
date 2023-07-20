import { decompressText, compressText } from '@common/utils/compression.util';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardValueMigrate0130To0140V21689850754083
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string }[] = await queryRunner.query(
      `SELECT id from whiteboard`
    );

    for (const canvas of canvases) {
      const [whiteboard]: { value: string }[] = await queryRunner.query(
        'SELECT value from whiteboard where id = ?',
        [canvas.id]
      );

      const migratedCompressedValue = await migrateValueAndCompress(
        whiteboard.value
      );

      if (!migratedCompressedValue) {
        // the value hasn't been migrated
        // the value does not need migrating or check the log for errors
        continue;
      }

      await queryRunner.query('UPDATE whiteboard SET value = ? WHERE id = ?', [
        migratedCompressedValue,
        canvas.id,
      ]);
    }

    const whiteboardTemplates: { id: string }[] = await queryRunner.query(
      `SELECT id from whiteboard_template`
    );

    for (const template of whiteboardTemplates) {
      const [whiteboardTemplate]: { value: string }[] = await queryRunner.query(
        'SELECT value from whiteboard_template where id = ?',
        [template.id]
      );

      const migratedCompressedValue = await migrateValueAndCompress(
        whiteboardTemplate.value
      );

      if (!migratedCompressedValue) {
        // the value hasn't been migrated
        // the value does not need migrating or check the log for errors
        continue;
      }

      await queryRunner.query(
        'UPDATE whiteboard_template SET value = ? WHERE id = ?',
        [migratedCompressedValue, template.id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const canvases: { id: string }[] = await queryRunner.query(
      `SELECT id from whiteboard`
    );

    for (const canvas of canvases) {
      const [whiteboard]: { value: string }[] = await queryRunner.query(
        'SELECT value from whiteboard where id = ?',
        [canvas.id]
      );

      const migratedCompressedValue = await migrateDownValueAndCompress(
        whiteboard.value
      );

      if (!migratedCompressedValue) {
        // the value hasn't been migrated
        // the value does not need migrating or check the log for errors
        continue;
      }

      await queryRunner.query('UPDATE whiteboard SET value = ? WHERE id = ?', [
        migratedCompressedValue,
        canvas.id,
      ]);
    }

    const whiteboardTemplates: { id: string }[] = await queryRunner.query(
      `SELECT id from whiteboard_template`
    );

    for (const template of whiteboardTemplates) {
      const [whiteboardTemplate]: { value: string }[] = await queryRunner.query(
        'SELECT value from whiteboard_template where id = ?',
        [template.id]
      );

      const migratedCompressedValue = await migrateDownValueAndCompress(
        whiteboardTemplate.value
      );

      if (!migratedCompressedValue) {
        // the value hasn't been migrated
        // the value does not need migrating or check the log for errors
        continue;
      }

      await queryRunner.query(
        'UPDATE whiteboard_template SET value = ? WHERE id = ?',
        [migratedCompressedValue, template.id]
      );
    }
  }
}

const migrateValueAndCompress = async (compressedValue: string) => {
  if (!compressedValue) {
    return undefined;
  }

  const decompressedValue = await decompressText(compressedValue);

  let canvasValue;
  try {
    canvasValue = JSON.parse(decompressedValue);
  } catch (error: any) {
    console.log(
      `Unable to parse value for whiteboard with id: '${
        error?.message ?? error.toString()
      }'`
    );
    return undefined;
  }

  if (!canvasValue.elements) {
    return undefined;
  }

  for (const element of canvasValue.elements) {
    if (element.strokeSharpness) {
      if (element.roundness) {
        delete element.strokeSharpness;
        continue;
      }
      element.roundness =
        element.strokeSharpness === 'sharp' ? null : { type: 3 };
      delete element.strokeSharpness;
    }
  }

  return compressText(JSON.stringify(canvasValue));
};

const migrateDownValueAndCompress = async (compressedValue: string) => {
  if (!compressedValue) {
    return undefined;
  }

  const decompressedValue = await decompressText(compressedValue);

  let canvasValue;
  try {
    canvasValue = JSON.parse(decompressedValue);
  } catch (error: any) {
    console.log(
      `Unable to parse value for whiteboard with id: '${
        error?.message ?? error.toString()
      }'`
    );
    return undefined;
  }

  if (!canvasValue.elements) {
    return undefined;
  }

  for (const element of canvasValue.elements) {
    if (element.roundness) {
      if (element.strokeSharpness) {
        delete element.roundness;
        continue;
      }
      element.strokeSharpness =
        element.roundness?.type === 3 ? 'round' : 'sharp';
      delete element.strokeSharpness;
    }
  }

  return compressText(JSON.stringify(canvasValue));
};
