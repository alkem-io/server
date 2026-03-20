import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconciles the platform.wellKnownVirtualContributors mapping with the actual VC actors
 * already present in DIRECT conversation memberships.
 *
 * Problem:
 *   When the well-known guidance VC is recreated, the platform mapping is updated to the
 *   new VC's ID (X) but:
 *   - Matrix/Synapse already has room memberships using the OLD actor's identity (Y)
 *   - Existing conversation_membership rows still reference Y
 *
 *   Updating conversation_membership.actorId to X would break Matrix-side operations
 *   (message attribution, room membership) because Synapse uses room-level identities
 *   that are hard to migrate.
 *
 * Fix (opposite direction vs. first draft):
 *   Preserve conversation_membership.actorId.
 *   Instead, update platform.wellKnownVirtualContributors so the mapping points BACK to
 *   the VC actor that is already present in the existing conversations (Y), ensuring:
 *   - findConversationBetweenActors(userActorId, Y) finds the existing conversation
 *   - createConversationWithWellKnownVC creates new conversations with Y (consistent with Synapse)
 *
 * Safety:
 *   Only updates the mapping when there is EXACTLY ONE distinct VC actor (from the same
 *   Account as the currently-mapped VC) across all existing DIRECT conversations.
 *   Multiple distinct stale actors → ambiguous → log warning, skip.
 *   No existing stale actors → no mismatch → skip.
 *
 * Testability:
 *   After running: SELECT "wellKnownVirtualContributors" FROM platform;
 *   The virtualContributorID in each mapping should match the actorId used in existing
 *   DIRECT conversation memberships for that well-known VC's account.
 *
 * Depends on: 1773800000001-FixWellKnownVCMappingsFormat (must run first).
 */
export class FixGuidanceVCMemberships1773800000002 implements MigrationInterface {
  name = 'FixGuidanceVCMemberships1773800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read current canonical mappings (format migration must have run already).
    const platforms = await queryRunner.query(
      `SELECT "wellKnownVirtualContributors"->'mappings' AS mappings FROM platform LIMIT 1`
    );

    const mappings: Array<{ wellKnown: string; virtualContributorID: string }> =
      platforms?.[0]?.mappings ?? [];

    if (mappings.length === 0) {
      console.log(
        '[Migration] FixGuidanceVCMemberships: no well-known VC mappings found, skipping'
      );
      return;
    }

    for (const mapping of mappings) {
      const { wellKnown, virtualContributorID: currentVcId } = mapping;

      // Find the account that owns the currently-mapped VC.
      const vcRows = await queryRunner.query(
        `SELECT "accountId" FROM virtual_contributor WHERE id = $1`,
        [currentVcId]
      );

      if (!vcRows?.[0]?.accountId) {
        console.log(
          `[Migration] FixGuidanceVCMemberships: well-known VC ${wellKnown} (id: ${currentVcId}) has no account — skipping`
        );
        continue;
      }

      const accountId: string = vcRows[0].accountId;

      // Find all DISTINCT VC actor IDs (from the same account, NOT the current mapping)
      // that appear in existing DIRECT conversation memberships.
      const staleActors = await queryRunner.query(
        `
        SELECT DISTINCT cm."actorId"
        FROM conversation_membership cm
        JOIN conversation c ON c.id = cm."conversationId"
        JOIN room r ON r.id = c."roomId"
        JOIN virtual_contributor vc ON vc.id = cm."actorId"
        WHERE r.type = 'conversation_direct'
          AND cm."actorId" != $1
          AND vc."accountId" = $2
        `,
        [currentVcId, accountId]
      );

      if (staleActors.length === 0) {
        console.log(
          `[Migration] FixGuidanceVCMemberships: no stale memberships found for ${wellKnown} — mapping is already consistent`
        );
        continue;
      }

      if (staleActors.length > 1) {
        const ids = staleActors.map((r: { actorId: string }) => r.actorId).join(', ');
        console.warn(
          `[Migration] FixGuidanceVCMemberships: ambiguous — ${staleActors.length} distinct stale VC actors found for ${wellKnown} (${ids}) — skipping to avoid incorrect update`
        );
        continue;
      }

      // Exactly one stale VC actor — safe to update the mapping to point to it.
      const correctVcId: string = staleActors[0].actorId;

      // Update the single matching entry inside the JSONB mappings array.
      await queryRunner.query(
        `
        UPDATE platform
        SET "wellKnownVirtualContributors" = jsonb_set(
          "wellKnownVirtualContributors",
          '{mappings}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN m->>'wellKnown' = $1
                THEN jsonb_build_object(
                  'wellKnown', m->>'wellKnown',
                  'virtualContributorID', $2::text
                )
                ELSE m
              END
            )
            FROM jsonb_array_elements("wellKnownVirtualContributors"->'mappings') AS m
          )
        )
        `,
        [wellKnown, correctVcId]
      );

      console.log(
        `[Migration] FixGuidanceVCMemberships: updated mapping for ${wellKnown} from ${currentVcId} → ${correctVcId} (account: ${accountId})`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot automatically revert — the previous virtualContributorID values are not
    // recorded in this migration. To rollback, re-run setPlatformWellKnownVirtualContributor
    // with the correct VC IDs, or restore from a database backup.
    console.log(
      '[Migration] FixGuidanceVCMemberships: down() is a no-op — manual rollback required'
    );
  }
}
