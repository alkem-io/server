import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Give `whiteboard.content` a temporary `DEFAULT ''` (006 staged rollout,
 * Release A). The whiteboard entity no longer maps the `content` column — its
 * content now lives as a Yjs-V2 snapshot in the document's own storage bucket,
 * located by `contentPointer` — so a new whiteboard INSERT omits `content`.
 *
 * The legacy `content` column is RETAINED in Release A (the destructive drop is
 * deferred to Release B until the operator back-fill is verified) and STAYS
 * `NOT NULL` (baseline: `whiteboard.content text NOT NULL`, no default). Adding a
 * `DEFAULT ''` lets an entity-unmapped insert receive an ignored empty sentinel
 * WITHOUT relaxing `NOT NULL` — so there is NO second NULL state, existing legacy
 * values are untouched, and an EXPLICIT `NULL` is still rejected. New rows carry a
 * real `contentPointer` and are excluded from the NULL-only back-fill.
 *
 * `memo.content` needs no counterpart — the baseline created it nullable (`bytea`).
 *
 * Reversible: `down()` drops ONLY the default (the column keeps `NOT NULL` and its
 * data). Release B deletes the column outright.
 */
export class DefaultLegacyWhiteboardContent1781950000000
  implements MigrationInterface
{
  name = 'DefaultLegacyWhiteboardContent1781950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ALTER COLUMN "content" SET DEFAULT ''`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "whiteboard" ALTER COLUMN "content" DROP DEFAULT`
    );
  }
}
