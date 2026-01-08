import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultCalloutTemplateToFlowState1767888440396
  implements MigrationInterface
{
  name = 'AddDefaultCalloutTemplateToFlowState1767888440396';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "innovation_flow_state"
            ADD COLUMN IF NOT EXISTS "defaultCalloutTemplateId" uuid
        `);

    const constraint = await queryRunner.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'innovation_flow_state'
            AND constraint_name = 'FK_innovation_flow_state_defaultCalloutTemplate'
        `);

    if (!constraint || constraint.length === 0) {
      await queryRunner.query(`
                ALTER TABLE "innovation_flow_state"
                ADD CONSTRAINT "FK_innovation_flow_state_defaultCalloutTemplate"
                FOREIGN KEY ("defaultCalloutTemplateId")
                REFERENCES "template"("id")
                ON DELETE SET NULL
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "innovation_flow_state"
            DROP CONSTRAINT IF EXISTS "FK_innovation_flow_state_defaultCalloutTemplate"
        `);

    await queryRunner.query(`
            ALTER TABLE "innovation_flow_state"
            DROP COLUMN IF EXISTS "defaultCalloutTemplateId"
        `);
  }
}
