import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fixes stale virtual contributor actor IDs in DIRECT conversation memberships.
 *
 * Problem:
 *   When the well-known guidance VC is recreated (new VC entity under the same Account),
 *   the platform mapping is updated to the new VC's ID (X) but existing DIRECT conversations
 *   still reference the old VC's actor ID (Y) in conversation_membership.
 *
 *   As a result, findConversationBetweenActors(userActorId, X) never finds the old
 *   conversation (which has Y as a member), so a duplicate conversation is created on
 *   every guidance session start.
 *
 * Fix:
 *   For each well-known VC mapping, find DIRECT conversations where a different VC from
 *   the same Account is listed as a member (stale reference), and update that membership
 *   to use the current well-known VC's actor ID.
 *
 *   Rows are only updated when the current VC is NOT already a member of the conversation
 *   (to avoid primary-key violations on the (conversationId, actorId) composite PK).
 *
 * Depends on: 1773800000001-FixWellKnownVCMappingsFormat (must run first so the
 *             mappings are in canonical array format).
 */
export class FixGuidanceVCMemberships1773800000002 implements MigrationInterface {
  name = 'FixGuidanceVCMemberships1773800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Read current well-known VC mappings (canonical array format after format migration).
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

      // Resolve the account that owns the current well-known VC.
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

      // Update conversation_membership rows in DIRECT conversations where:
      //  - The VC member belongs to the same Account as the current well-known VC
      //  - But its actor ID differs from the current well-known VC's actor ID (stale ref)
      //  - The current well-known VC is NOT already a member (avoids PK violation)
      //
      // CTE identifies stale rows without referencing the UPDATE target inside a JOIN ON
      // (PostgreSQL forbids that and raises "invalid reference to FROM-clause entry").
      const updateResult = await queryRunner.query(
        `
        WITH stale AS (
          SELECT cm."conversationId", cm."actorId" AS stale_actor_id
          FROM conversation_membership cm
          JOIN conversation c ON c.id = cm."conversationId"
          JOIN room r ON r.id = c."roomId"
          JOIN virtual_contributor stale_vc ON stale_vc.id = cm."actorId"
          WHERE r.type = 'conversation_direct'
            AND cm."actorId" != $1
            AND stale_vc."accountId" = $2
            AND NOT EXISTS (
              SELECT 1 FROM conversation_membership cm2
              WHERE cm2."conversationId" = cm."conversationId"
                AND cm2."actorId" = $1
            )
        )
        UPDATE conversation_membership
        SET "actorId" = $1
        FROM stale
        WHERE conversation_membership."conversationId" = stale."conversationId"
          AND conversation_membership."actorId" = stale.stale_actor_id
        `,
        [currentVcId, accountId]
      );

      console.log(
        `[Migration] FixGuidanceVCMemberships: updated ${updateResult[1] ?? 0} stale memberships for well-known VC ${wellKnown} (account: ${accountId})`
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Cannot automatically revert — the original stale actor IDs are not recorded.
    // Manual rollback is required if this migration needs to be undone.
    console.log(
      '[Migration] FixGuidanceVCMemberships: down() is a no-op — manual rollback required'
    );
  }
}
