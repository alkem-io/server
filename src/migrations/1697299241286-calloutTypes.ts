import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutTypes1697299241286 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE profile SET type = 'callout-framing' WHERE type = 'callout';`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(`not implemented - ${queryRunner} `);
  }
}
