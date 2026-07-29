import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widen the constraints on every existing BANNER visual row.
 *
 * The constraints in `visual.constraints.ts` are denormalized onto each `visual`
 * row at creation time, and `VisualService.validateImageWidth/Height` reads the
 * ROW, never the constants. Changing `DEFAULT_VISUAL_CONSTRAINTS[BANNER]` alone
 * would therefore only affect newly created visuals — every pre-existing space
 * would keep rejecting uploads at the old 1536x256 ceiling. This migration
 * re-syncs the stored bounds so the new ceiling actually applies platform-wide.
 *
 * Why the change: after the CRD/shadcn migration the space page banner renders
 * full-bleed at the viewport width (`aspect-[6/1]`, no max-width), so a 1536px
 * source is upscaled ~2x on a wide monitor and ~2x again on a HiDPI display.
 *
 *   minWidth   384 ->  1536      (new floor = old ceiling)
 *   maxWidth  1536 ->  3840      (3840 CSS px @1x, 1920 CSS px @2x)
 *   minHeight   64 ->   256
 *   maxHeight  256 ->   640
 *   aspectRatio 6 ->      6      (unchanged)
 *
 * Data-only, idempotent, no DDL, no authorization_policy writes, no auth reset.
 * Existing `uri` values are untouched — an already-uploaded small banner keeps
 * rendering; only the NEXT upload is held to the new floor.
 *
 * Scope note: `bannerWide` (innovation hubs) is deliberately NOT touched here.
 *
 * Rollback: down() restores the previous bounds verbatim. Any banner uploaded
 * at >1536px while up() was applied keeps its uri and still renders; it simply
 * could not be re-uploaded at that size until up() is applied again.
 */
export class WidenSpaceBannerVisualConstraints1785283200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "visual" SET
         "minWidth" = 1536,
         "maxWidth" = 3840,
         "minHeight" = 256,
         "maxHeight" = 640,
         "aspectRatio" = 6
       WHERE "name" = 'banner'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "visual" SET
         "minWidth" = 384,
         "maxWidth" = 1536,
         "minHeight" = 64,
         "maxHeight" = 256,
         "aspectRatio" = 6
       WHERE "name" = 'banner'`
    );
  }
}
