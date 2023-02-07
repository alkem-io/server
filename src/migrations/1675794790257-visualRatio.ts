import { MigrationInterface, QueryRunner } from 'typeorm';

export class visualRatio1675794790257 implements MigrationInterface {
  name = 'visualRatio1675794790257';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`visual\` MODIFY \`aspectRatio\` FLOAT`
    );
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, aspectRatio from visual`
    );
    for (const visual of visuals) {
      if (visual.name === 'bannerNarrow') {
        await queryRunner.query(
          `UPDATE visual SET aspectRatio = '1.6' WHERE (id = '${visual.id}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`visual\` MODIFY \`aspectRatio\` INT(11)`
    );
  }
}
