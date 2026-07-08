import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 008-continuous-file-backup — create the `file_backup_outbox` table in the alkemio DB
 * plus a scoped, password-free consumer role.
 *
 * server owns the alkemio-DB schema (TypeORM migrations via the `server-migration` cron),
 * so the outbox DDL lives here — the cross-repo contract is
 * `agents-hq/specs/008-continuous-file-backup/contracts/outbox.sql`. **server does NOT read
 * or write this table at runtime** (there is deliberately no TypeORM entity for it):
 * file-service does the transactional INSERT (in the same commit as the `file` row) + a
 * periodic prune, and file-backup-service claims rows via the scoped role with
 * `FOR UPDATE SKIP LOCKED`.
 *
 * Column names are **quoted camelCase** to match the Go writers/readers (TypeORM's
 * snake_case default would break them). The consumer's startup Probe SELECTs every column,
 * so any drift fails loudly at deploy. `size` is BIGINT (objects may exceed 2 GiB); the
 * retry/lease columns `"visibleAt"` + `deliveries` are the ones the consumer's backoff +
 * crash-loop bound already depend on.
 *
 * The `filebackup_consumer` role is **NOLOGIN and password-free** — a privilege bundle, not
 * a credential — so this migration is self-contained and runs first with no external
 * prerequisite; infrastructure-operations attaches LOGIN + a password to the role before the
 * worker connects. Least-privilege: SELECT/UPDATE on the outbox (file-service does the INSERT
 * + prune) and SELECT on `file` (for the backup worker's backfill corpus enumeration).
 */
export class FileBackupOutbox1783508955161 implements MigrationInterface {
  name = 'FileBackupOutbox1783508955161';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "file_backup_outbox" (
        "id"          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "fileId"      uuid                     NOT NULL,
        "externalID"  character varying(128)   NOT NULL,
        "priority"    smallint                 NOT NULL DEFAULT 0,
        "status"      character varying(16)    NOT NULL DEFAULT 'pending',
        "attempts"    integer                  NOT NULL DEFAULT 0,
        "deliveries"  integer                  NOT NULL DEFAULT 0,
        "lastError"   text,
        "createdBy"   uuid,
        "createdDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "size"        bigint                   NOT NULL DEFAULT 0,
        "claimedAt"   TIMESTAMP WITH TIME ZONE,
        "visibleAt"   TIMESTAMP WITH TIME ZONE
      )
    `);
    // Claim scan: only pending rows whose backoff elapsed, hot first, oldest first.
    await queryRunner.query(`
      CREATE INDEX "idx_file_backup_outbox_claim"
        ON "file_backup_outbox" ("priority" DESC, "createdDate")
        WHERE "status" = 'pending'
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_file_backup_outbox_external"
        ON "file_backup_outbox" ("externalID")
    `);
    // NOLOGIN, password-free privilege role (guarded — CREATE ROLE has no IF NOT EXISTS).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'filebackup_consumer') THEN
          CREATE ROLE "filebackup_consumer" NOLOGIN;
        END IF;
      END $$
    `);
    await queryRunner.query(
      `GRANT SELECT, UPDATE ON "file_backup_outbox" TO "filebackup_consumer"`
    );
    // SELECT on `file` for backfill's corpus enumeration. Guarded by existence so this
    // migration is robust regardless of `file`-table provisioning order.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'file') THEN
          GRANT SELECT ON "file" TO "filebackup_consumer";
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'file') THEN
          REVOKE SELECT ON "file" FROM "filebackup_consumer";
        END IF;
      END $$
    `);
    await queryRunner.query(
      `REVOKE SELECT, UPDATE ON "file_backup_outbox" FROM "filebackup_consumer"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "file_backup_outbox"`);
    // Drop the role last (after its grants are gone). Guarded; a real rollout would not roll
    // back past infra-ops attaching LOGIN, but the guard keeps down() safe if it does.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'filebackup_consumer') THEN
          DROP ROLE "filebackup_consumer";
        END IF;
      END $$
    `);
  }
}
