import type { MigrationInterface, QueryRunner } from 'typeorm';

type PreflightRow = {
  memoUnmigrated?: unknown;
  whiteboardUnmigrated?: unknown;
};

const parseCount = (value: unknown): number | undefined => {
  if (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  ) {
    return value;
  }
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }
  return undefined;
};

/**
 * Release B for 006-collab-content-unification.
 *
 * This migration is intentionally separate from additive Release A. Operators
 * first hold the memo/whiteboard write fence, migrate every legacy row, and run
 * the Release-A verifier. The ACCESS EXCLUSIVE lock then closes the residual
 * count-to-DDL race: even a mistakenly undrained writer cannot insert a fresh
 * NULL pointer between this migration's preflight and the column drops.
 *
 * Only the legacy recovery sources are removed. `contentPointer` remains
 * nullable because a newly-created document legitimately has a short interval
 * between its row insert and initial snapshot attachment.
 */
export class DropLegacyMemoWhiteboardContent1787551200000
  implements MigrationInterface
{
  name = 'DropLegacyMemoWhiteboardContent1787551200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `LOCK TABLE "memo", "whiteboard" IN ACCESS EXCLUSIVE MODE`
    );

    const rows = (await queryRunner.query(`
      SELECT
        (SELECT COUNT(*)::integer
           FROM "memo"
          WHERE "contentPointer" IS NULL
             OR btrim("contentPointer") = '') AS "memoUnmigrated",
        (SELECT COUNT(*)::integer
           FROM "whiteboard"
          WHERE "contentPointer" IS NULL
             OR btrim("contentPointer") = '') AS "whiteboardUnmigrated"
    `)) as PreflightRow[];
    const memoUnmigrated = parseCount(rows[0]?.memoUnmigrated);
    const whiteboardUnmigrated = parseCount(
      rows[0]?.whiteboardUnmigrated
    );

    if (memoUnmigrated === undefined || whiteboardUnmigrated === undefined) {
      throw new Error(
        'Release B refused: invalid preflight result while counting unmigrated memo/whiteboard rows'
      );
    }
    if (memoUnmigrated > 0 || whiteboardUnmigrated > 0) {
      throw new Error(
        `Release B refused: memo/whiteboard rows still have NULL or blank contentPointer (memo=${memoUnmigrated}, whiteboard=${whiteboardUnmigrated})`
      );
    }

    await queryRunner.query(`ALTER TABLE "memo" DROP COLUMN "content"`);
    await queryRunner.query(`ALTER TABLE "whiteboard" DROP COLUMN "content"`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Release B is irreversible: dropped legacy content bytes cannot be reconstructed; restore the coordinated database and file-storage backup or forward-fix'
    );
  }
}
