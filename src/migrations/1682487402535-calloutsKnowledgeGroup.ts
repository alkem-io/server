import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutsKnowledgeGroup1682487402535 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const callouts: { id: string }[] = await queryRunner.query(
      `SELECT id FROM callout WHERE (callout.group IS NULL OR callout.group = '')`
    );
    for (const callout of callouts) {
      await queryRunner.query(
        `UPDATE callout SET callout.group = 'KNOWLEDGE' WHERE id = '${callout.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const callouts: { id: string }[] = await queryRunner.query(
      `SELECT id FROM callout WHERE callout.group = 'KNOWLEDGE'`
    );

    for (const callout of callouts) {
      await queryRunner.query(
        `UPDATE callout SET callout.group = NULL WHERE id = '${callout.id}'`
      );
    }
  }
}
