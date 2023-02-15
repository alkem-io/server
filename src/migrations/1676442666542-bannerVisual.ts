import { MigrationInterface, QueryRunner } from 'typeorm';

export class bannerVisual1676442666542 implements MigrationInterface {
  name = 'bannerVisual1676442666542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, aspectRatio from visual`
    );
    for (const visual of visuals) {
      if (visual.name === 'banner') {
        await queryRunner.query(
          `UPDATE visual SET maxWidth = '1536', maxHeight = '256', minHeight = '64' WHERE (id = '${visual.id}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, aspectRatio from visual`
    );
    for (const visual of visuals) {
      if (visual.name === 'banner') {
        await queryRunner.query(
          `UPDATE visual SET maxWidth = '768', maxHeight = '128', minHeight = '32' WHERE (id = '${visual.id}')`
        );
      }
    }
  }
}
