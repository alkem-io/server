import { MigrationInterface, QueryRunner } from 'typeorm';

const allowedTypesOld = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
];
const allowedTypesNew = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
];

export class visualType1679337397066 implements MigrationInterface {
  name = 'visualType1679337397066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, allowedTypes from visual`
    );
    for (const visual of visuals) {
      await queryRunner.query(
        `UPDATE visual SET allowedTypes = '${allowedTypesNew}' WHERE (id = '${visual.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, allowedTypes from visual`
    );
    for (const visual of visuals) {
      await queryRunner.query(
        `UPDATE visual SET allowedTypes = '${allowedTypesOld}' WHERE (id = '${visual.id}')`
      );
    }
  }
}
