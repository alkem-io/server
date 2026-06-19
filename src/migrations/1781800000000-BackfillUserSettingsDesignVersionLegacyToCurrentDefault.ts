import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillUserSettingsDesignVersionLegacyToCurrentDefault1781800000000
  implements MigrationInterface
{
  name = 'BackfillUserSettingsDesignVersionLegacyToCurrentDefault1781800000000';

  // Phase 3 (2026-06-17) — one-shot backfill to flip all rows holding the
  // legacy designVersion (1) onto the current default (2). The legacy
  // generation is on an imminent decommission path; this normalises the
  // persisted distribution while the API still permits opting back into 1
  // (FR-004). New inserts continue to default to 2 — the column default was
  // already set by migration 1779797470780 in Phase 2 and is not touched
  // here.
  //
  // Scope: only rows currently holding the legacy value 1. Any other integer
  // (0, -1, 5, 7, …) is preserved verbatim — FR-004 still applies; this is
  // the legacy-to-current-default flip, not a clamp.
  //
  // Idempotent — re-applying affects zero rows once the legacy distribution
  // has been drained.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "user_settings" SET "designVersion" = 2 WHERE "designVersion" = 1`
    );
  }

  // No automatic rollback. We do not track which rows previously held 1, so
  // a symmetric down() that flipped 2 → 1 would clobber every user that was
  // legitimately on 2 (which after this migration is every user). Operators
  // who must revert should restore a pre-migration database backup.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. See note above.
  }
}
