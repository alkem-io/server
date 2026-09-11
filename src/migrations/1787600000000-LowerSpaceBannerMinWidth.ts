import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lower the minimum width required for a space BANNER upload from 1536px to
 * 1200px (client-web#10178).
 *
 * The constraints in `visual.constraints.ts` are denormalized onto each
 * `visual` row at creation time, and `VisualService.validateImageWidth/Height`
 * reads the ROW, never the constants. Changing `DEFAULT_VISUAL_CONSTRAINTS`
 * alone would therefore only affect newly created visuals — every pre-existing
 * space would keep rejecting uploads narrower than 1536px. This migration
 * re-syncs the stored floor so the new minimum applies platform-wide.
 *
 *   minWidth   1536 -> 1200
 *   minHeight   154 ->  120   (= ceil(minWidth / maxAspectRatio) = 1200/10)
 *   maxWidth   3840 -> 3840   (unchanged)
 *   maxHeight   640 ->  640   (unchanged)
 *   aspectRatio   6 ->    6   (unchanged — per-space user data, never written)
 *
 * `minHeight` has to follow `minWidth`: the height bounds span the whole 6-10
 * aspect-ratio range a space admin may choose from, so keeping minHeight at
 * 154 would still reject a legitimate 1200x120 (10:1) upload.
 *
 * Data-only, idempotent, no DDL, no authorization_policy writes, no auth reset.
 * Existing `uri` values are untouched.
 *
 * Scope note: `bannerWide` (innovation hubs) is deliberately NOT touched here.
 *
 * Rollback: down() restores the 1536/154 floor from
 * `1785283200000-WidenSpaceBannerVisualConstraints`. Any banner uploaded at
 * 1200-1535px while up() was applied keeps its uri and still renders; it simply
 * could not be re-uploaded at that size until up() is applied again.
 */
export class LowerSpaceBannerMinWidth1787600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "visual" SET
         "minWidth" = 1200,
         "minHeight" = 120
       WHERE "name" = 'banner'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "visual" SET
         "minWidth" = 1536,
         "minHeight" = 154
       WHERE "name" = 'banner'`
    );
  }
}
