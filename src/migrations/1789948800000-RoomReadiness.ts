import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the recorded provisioning readiness of a messaging room as one
 * add-only jsonb column. Rows that predate recording are backfilled with the
 * honest `UNKNOWN / LEGACY_UNVERIFIED` marker rather than `READY`: whether
 * their backend room exists is not known until the operator reconciliation
 * sweep probes them.
 *
 * Idempotent through `ADD COLUMN IF NOT EXISTS`; `down` drops the column
 * symmetrically. Previous code ignores the column, so a rollback of the
 * application without running `down` is also safe.
 */
export class RoomReadiness1789948800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room"
      ADD COLUMN IF NOT EXISTS "readiness" jsonb NOT NULL
      DEFAULT '{"state":"UNKNOWN","reason":"LEGACY_UNVERIFIED","updatedAt":"2026-09-21T00:00:00.000Z"}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room" DROP COLUMN IF EXISTS "readiness"
    `);
  }
}
