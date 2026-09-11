import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make 10:1 (the slim strip) the default aspect ratio of a BANNER visual that
 * has no image yet, aligning the server with client-web's design default.
 *
 * `DEFAULT_VISUAL_CONSTRAINTS[BANNER].aspectRatio` is denormalized onto each
 * `visual` row at creation time. Until an image is uploaded that stored value
 * is nothing but the creation default — chosen by nobody. The moment an image
 * IS uploaded, `uploadImageOnVisual` overwrites it with the ratio derived from
 * the real pixels (width / height, 1 decimal), and a space admin may afterwards
 * pick any ratio in the 6-10 range via `updateVisual`. So:
 *
 *   - rows WITH an image (`uri` non-empty) are NEVER touched: their ratio was
 *     derived from real pixels or chosen by an admin, and is user data;
 *   - rows WITHOUT an image still carrying the old creation default 6 are
 *     re-synced to the new creation default 10, so an existing empty banner
 *     and a freshly created one agree on what "default" means.
 *
 *   aspectRatio   6 -> 10   (only where "uri" is empty AND aspectRatio = 6)
 *   minWidth / maxWidth / minHeight / maxHeight   unchanged
 *
 * The admin range stays 6-10, and the height bounds already span that whole
 * range (see `1785283200000-WidenSpaceBannerVisualConstraints`), so no other
 * stored constraint has to move.
 *
 * About the `uri` predicate: the column is `character varying(2048) NOT NULL`
 * with no SQL DEFAULT (baseline migration) and no entity-level default;
 * `VisualService.createVisual` writes `initialUri ?? ''`, so a banner without
 * an image is stored as `''`, never NULL. The `IS NULL` branch is kept only as
 * a belt-and-braces guard and matches no row today.
 *
 * Data-only, idempotent, no DDL, no authorization_policy writes, no auth reset.
 * Existing `uri` values are untouched. Re-running up() is a no-op because the
 * `"aspectRatio" = 6` predicate no longer matches after the first run.
 *
 * Scope note: the `"name" = 'banner'` filter covers EVERY profile that owns a
 * BANNER-type visual (spaces, callout framings, etc.). That is intended: a
 * banner with no image has no chosen shape anywhere, so the creation default
 * is the only meaning its `aspectRatio` can have. `bannerWide` (innovation
 * hubs) is deliberately NOT touched here.
 *
 * Rollback: down() restores 6 on the same set of rows (no image, currently at
 * the new default 10). A banner that received an image while up() was applied
 * keeps its pixel-derived ratio and its uri and is not rewritten either way.
 */
export class SetBannerDefaultAspectRatio1788300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "visual" SET
         "aspectRatio" = 10
       WHERE "name" = 'banner'
         AND ("uri" IS NULL OR "uri" = '')
         AND "aspectRatio" = 6`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "visual" SET
         "aspectRatio" = 6
       WHERE "name" = 'banner'
         AND ("uri" IS NULL OR "uri" = '')
         AND "aspectRatio" = 10`
    );
  }
}
