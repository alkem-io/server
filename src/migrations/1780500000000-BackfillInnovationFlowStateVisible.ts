import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the `visible` flag (story #6138) into the JSONB `settings` of every
 * existing innovation_flow_state so that pre-existing phases stay visible after
 * deploy (FR-004). `visible` is a UI navigation hint only — it does NOT affect
 * authorization or content access.
 *
 * Idempotent: only writes where the key is absent, so re-running is a no-op and
 * an admin-chosen `visible:false` is never overwritten (FR-008).
 */
export class BackfillInnovationFlowStateVisible1780500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_flow_state
      SET settings = jsonb_set(settings, '{visible}', 'true'::jsonb, true)
      WHERE settings IS NOT NULL
        AND settings -> 'visible' IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_flow_state
      SET settings = settings #- '{visible}'
      WHERE settings -> 'visible' IS NOT NULL
    `);
  }
}
