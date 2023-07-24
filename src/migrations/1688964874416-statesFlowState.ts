import { MigrationInterface, QueryRunner } from 'typeorm';

export class statesFlowState1688964874416 implements MigrationInterface {
  name = 'statesFlowState1688964874416';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tagsets: { id: string }[] = await queryRunner.query(
      `SELECT id FROM tagset where (name = 'states')`
    );
    for (const tagset of tagsets) {
      await queryRunner.query(
        `UPDATE tagset SET name = 'flow-state' WHERE (id = '${tagset.id}')`
      );
    }
    const tagsetTemplates: { id: string }[] = await queryRunner.query(
      `SELECT id FROM tagset_template where (name = 'states')`
    );
    for (const tagsetTemplate of tagsetTemplates) {
      await queryRunner.query(
        `UPDATE tagset_template SET name = 'flow-state' WHERE (id = '${tagsetTemplate.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tagsets: { id: string }[] = await queryRunner.query(
      `SELECT id FROM tagset where (name = 'flow-state')`
    );
    for (const tagset of tagsets) {
      await queryRunner.query(
        `UPDATE tagset SET name = 'states' WHERE (id = '${tagset.id}')`
      );
    }
    const tagsetTemplates: { id: string }[] = await queryRunner.query(
      `SELECT id FROM tagset_template where (name = 'flow-state')`
    );
    for (const tagsetTemplate of tagsetTemplates) {
      await queryRunner.query(
        `UPDATE tagset_template SET name = 'states' WHERE (id = '${tagsetTemplate.id}')`
      );
    }
  }
}
