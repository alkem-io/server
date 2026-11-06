import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs space community roles whose `role.credential.resourceID` points at a
 * different space, together with the credentials that were issued through them.
 *
 * Cause: before efb6d8ea8 (server#6467) `RoleService.createRole` aliased the
 * module-level role definitions (`space.defaults.service.ts`
 * spaceCommunityRoles / subspaceCommunityRoles) and
 * `RoleSetService.updateRoleResourceID` mutated `credential.resourceID` in
 * place. When `createSpace` recursively created template subspaces, the child
 * overwrote the shared object and the parent persisted the child's id. Every
 * later `assignActorToRole` on the parent then issued credentials for the child.
 * efb6d8ea8 fixed new data only. On acceptance (2026-11-04): 162 roles on 54
 * spaces, 167 issued credentials, 6,414 authorization policies.
 *
 * What up() does, in one transaction:
 *  1. Points every mis-pointed space role back at its owning space.
 *  2. For each credential (type, wrong target) held through such a role,
 *     decides where it came from:
 *     - owner evidence: a `member-joined` activity for the holder in the
 *       owner's collaboration within 60 s of the credential, or an
 *       invitation/application on the owner's role set whose roles cover the
 *       credential type;
 *     - target evidence: the same tests against the target space.
 *     With owner evidence, it grants the credential for the owner space if
 *     missing. With owner evidence and no target evidence, it revokes the
 *     credential for the target, unless it is a membership and the holder is
 *     a member of one of the target's subspaces (subspace membership requires
 *     parent membership). A credential for a target that no longer exists is
 *     always revoked. Credentials with no evidence either way are
 *     left as they are and logged as `ambiguous` for manual review.
 *  3. Recomputes `space-subspace-admin` for the affected owners: admins of any
 *     child space get it on the owner, and the copy issued for the wrong target
 *     is revoked unless the holder administers a child of that target.
 *  4. Recomputes `parentCredentials` for every role in the affected owners'
 *     subtrees from the corrected ancestor chain (nearest ancestor first),
 *     which is what `RoleSetService.setParentRoleSetAndCredentials` produces.
 *  5. Verifies that no mis-pointed space role remains; otherwise it throws and
 *     the transaction rolls back.
 * Every change is written to `_repair_mispointed_role_credentials` so that
 * down() can restore the previous state exactly. Running up() again is a no-op:
 * the detection in step 1 finds nothing.
 *
 * Post-deploy (required): authorization policies are stored rows, so run
 * `mutation { authorizationPolicyResetAll }` (or reset each affected L0 space)
 * and let it drain. Role-set membership caches expire after
 * `collaboration.membership.cache_ttl` (default 4 h); flush them in Redis to
 * apply the change immediately.
 *
 * Detection and evidence queries are mirrored by the data-consistency suite
 * (checks `auth-role-space-resourceid-mismatch`,
 * `gap-auth-semantic-and-entitlement-mispointed-role-creds-issued`).
 */
export class RepairMispointedSpaceRoleCredentials1791400000000
  implements MigrationInterface
{
  name = 'RepairMispointedSpaceRoleCredentials1791400000000';

  private readonly logTable = '_repair_mispointed_role_credentials';
  private readonly evidenceWindowSeconds = 60;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${this.logTable}" (
        "seq" SERIAL PRIMARY KEY,
        "createdDate" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "action" VARCHAR(64) NOT NULL,
        "entity" VARCHAR(32) NOT NULL,
        "entityId" UUID NOT NULL,
        "before" JSONB,
        "after" JSONB,
        "note" TEXT
      )`);

    // 1. Mis-pointed space roles: credential.resourceID differs from the owning space.
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_roles`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_roles AS
      SELECT r.id AS role_id, r.name, r."roleSetId" AS roleset_id, s.id AS owner_space_id,
             r.credential AS old_credential, r.credential->>'type' AS ctype,
             r.credential->>'resourceID' AS target
      FROM space s
      JOIN community c ON c.id = s."communityId"
      JOIN role r ON r."roleSetId" = c."roleSetId"
      WHERE r.credential->>'type' LIKE 'space-%'
        AND r.credential->>'resourceID' IS DISTINCT FROM s.id::text`);
    const [{ count: roleCount }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM _rmr_roles`
    );
    if (roleCount === 0) {
      await queryRunner.query(`DROP TABLE _rmr_roles`);
      return;
    }

    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_pairs`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_pairs AS
      SELECT DISTINCT ro.owner_space_id, ro.roleset_id AS owner_roleset_id,
             os."collaborationId" AS owner_collab, ro.target,
             ts.id AS target_space_id, tc."roleSetId" AS target_roleset_id,
             ts."collaborationId" AS target_collab
      FROM _rmr_roles ro
      JOIN space os ON os.id = ro.owner_space_id
      LEFT JOIN space ts ON ts.id::text = ro.target
      LEFT JOIN community tc ON tc.id = ts."communityId"`);

    // 2. Credentials issued through the mis-pointed roles, with their evidence.
    //    Role name -> invitation.extraRoles value: member is implied, lead/admin are explicit.
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_holders`);
    await queryRunner.query(
      `
      CREATE TEMP TABLE _rmr_holders AS
      SELECT cr.id AS credential_id, cr."actorId" AS actor_id, cr.type AS ctype,
             cr."createdDate" AS cdate, ro.name AS role_name, p.*,
             (
               EXISTS (SELECT 1 FROM activity a
                       WHERE a.type = 'member-joined' AND a."collaborationID" = p.owner_collab
                         AND a."resourceID" = cr."actorId"
                         AND abs(extract(epoch FROM cr."createdDate" - a."createdDate")) <= $1)
               OR EXISTS (SELECT 1 FROM invitation i
                          WHERE i."roleSetId" = p.owner_roleset_id AND i."invitedActorId" = cr."actorId"
                            AND (ro.name = 'member' OR ro.name = ANY (string_to_array(i."extraRoles", ','))))
               OR (ro.name = 'member' AND EXISTS (SELECT 1 FROM application ap
                          WHERE ap."roleSetId" = p.owner_roleset_id AND ap."userId" = cr."actorId"))
             ) AS owner_evidence,
             (
               p.target_space_id IS NOT NULL AND (
                 EXISTS (SELECT 1 FROM activity a
                         WHERE a.type = 'member-joined' AND a."collaborationID" = p.target_collab
                           AND a."resourceID" = cr."actorId"
                           AND abs(extract(epoch FROM cr."createdDate" - a."createdDate")) <= $1)
                 OR EXISTS (SELECT 1 FROM invitation i
                            WHERE i."roleSetId" = p.target_roleset_id AND i."invitedActorId" = cr."actorId"
                              AND (ro.name = 'member' OR ro.name = ANY (string_to_array(i."extraRoles", ','))))
                 OR (ro.name = 'member' AND EXISTS (SELECT 1 FROM application ap
                            WHERE ap."roleSetId" = p.target_roleset_id AND ap."userId" = cr."actorId"))
               )
             ) AS target_evidence
      FROM _rmr_pairs p
      JOIN _rmr_roles ro ON ro.owner_space_id = p.owner_space_id AND ro.target = p.target
      JOIN credential cr ON cr.type = ro.ctype AND cr."resourceID" = p.target AND cr."actorId" IS NOT NULL`,
      [this.evidenceWindowSeconds]
    );

    // 1 (apply). Point the roles back at the owning space.
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "before", "after")
      SELECT 'role-credential-fixed', 'role', role_id, old_credential,
             jsonb_set(old_credential, '{resourceID}', to_jsonb(owner_space_id::text))
      FROM _rmr_roles`);
    await queryRunner.query(`
      UPDATE role r
      SET credential = jsonb_set(r.credential, '{resourceID}', to_jsonb(ro.owner_space_id::text)),
          "updatedDate" = now(), version = r.version + 1
      FROM _rmr_roles ro WHERE ro.role_id = r.id`);

    // 2a. Grant the owner credential where the owner role set issued it.
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_grants`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_grants AS
      SELECT DISTINCT ON (h.actor_id, h.ctype, h.owner_space_id)
             gen_random_uuid() AS id, h.actor_id, h.ctype, h.owner_space_id, h.cdate
      FROM _rmr_holders h
      WHERE h.owner_evidence
        AND NOT EXISTS (SELECT 1 FROM credential c
                        WHERE c."actorId" = h.actor_id AND c.type = h.ctype
                          AND c."resourceID" = h.owner_space_id::text)
      ORDER BY h.actor_id, h.ctype, h.owner_space_id, h.cdate`);
    await queryRunner.query(`
      INSERT INTO credential (id, "createdDate", "updatedDate", version, "resourceID", type, "actorId")
      SELECT id, cdate, now(), 1, owner_space_id::text, ctype, actor_id FROM _rmr_grants`);
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "after", "note")
      SELECT 'credential-granted', 'credential', g.id, to_jsonb(c), 'owner evidence'
      FROM _rmr_grants g JOIN credential c ON c.id = g.id`);

    // 2b. Revoke the wrong-target credential (no target evidence, or target gone).
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_revokes`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_revokes AS
      SELECT DISTINCT h.credential_id,
             CASE WHEN h.target_space_id IS NULL THEN 'target space deleted'
                  ELSE 'issued by owner role set, no target evidence' END AS note
      FROM _rmr_holders h
      WHERE h.target_space_id IS NULL
         OR (h.owner_evidence AND NOT h.target_evidence
             AND NOT EXISTS (SELECT 1 FROM _rmr_holders t
                             WHERE t.credential_id = h.credential_id AND t.target_evidence)
             -- Keep the target membership when the holder is a member of one of the target's
             -- subspaces through that subspace's own (correct) role: subspace membership
             -- requires parent membership.
             AND NOT (h.ctype = 'space-member' AND EXISTS (
               SELECT 1 FROM space child
               JOIN credential m ON m.type = 'space-member' AND m."resourceID" = child.id::text
               WHERE child."parentSpaceId" = h.target_space_id AND m."actorId" = h.actor_id
                 AND m.id NOT IN (SELECT credential_id FROM _rmr_holders
                                  WHERE owner_evidence AND NOT target_evidence))))`);
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "before", "note")
      SELECT DISTINCT ON (h.credential_id) 'credential-kept', 'credential', h.credential_id, to_jsonb(c),
             'issued by owner role set, kept: holder is a member of a subspace of the target'
      FROM _rmr_holders h JOIN credential c ON c.id = h.credential_id
      WHERE h.owner_evidence AND NOT h.target_evidence AND h.target_space_id IS NOT NULL
        AND h.credential_id NOT IN (SELECT credential_id FROM _rmr_revokes)`);
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "before", "note")
      SELECT 'credential-revoked', 'credential', c.id, to_jsonb(c), rv.note
      FROM _rmr_revokes rv JOIN credential c ON c.id = rv.credential_id`);
    await queryRunner.query(
      `DELETE FROM credential WHERE id IN (SELECT credential_id FROM _rmr_revokes)`
    );
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "before", "note")
      SELECT DISTINCT ON (h.credential_id) 'credential-ambiguous', 'credential', h.credential_id, to_jsonb(c),
             'no owner or target evidence; left unchanged for manual review'
      FROM _rmr_holders h JOIN credential c ON c.id = h.credential_id
      WHERE NOT h.owner_evidence AND NOT h.target_evidence AND h.target_space_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM _rmr_holders o
                        WHERE o.credential_id = h.credential_id AND (o.owner_evidence OR o.target_evidence))`);

    // 3. space-subspace-admin: issued on the parent role set's admin resourceID, i.e. the
    //    wrong target. Re-derive it from the (corrected) space-admin credentials.
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_subadmin_grants`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_subadmin_grants AS
      SELECT DISTINCT ON (c."actorId", p.owner_space_id)
             gen_random_uuid() AS id, c."actorId" AS actor_id, p.owner_space_id
      FROM (SELECT DISTINCT owner_space_id FROM _rmr_pairs) p
      JOIN space child ON child."parentSpaceId" = p.owner_space_id
      JOIN credential c ON c.type = 'space-admin' AND c."resourceID" = child.id::text AND c."actorId" IS NOT NULL
      WHERE NOT EXISTS (SELECT 1 FROM credential x
                        WHERE x."actorId" = c."actorId" AND x.type = 'space-subspace-admin'
                          AND x."resourceID" = p.owner_space_id::text)`);
    await queryRunner.query(`
      INSERT INTO credential (id, "createdDate", "updatedDate", version, "resourceID", type, "actorId")
      SELECT id, now(), now(), 1, owner_space_id::text, 'space-subspace-admin', actor_id
      FROM _rmr_subadmin_grants`);
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "after", "note")
      SELECT 'credential-granted', 'credential', g.id, to_jsonb(c), 'subspace admin of owner'
      FROM _rmr_subadmin_grants g JOIN credential c ON c.id = g.id`);
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_subadmin_revokes`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_subadmin_revokes AS
      SELECT DISTINCT c.id AS credential_id
      FROM _rmr_pairs p
      JOIN credential c ON c.type = 'space-subspace-admin' AND c."resourceID" = p.target
      WHERE NOT EXISTS (SELECT 1 FROM space child
                        JOIN credential a ON a.type = 'space-admin' AND a."resourceID" = child.id::text
                        WHERE child."parentSpaceId"::text = p.target AND a."actorId" = c."actorId")
        AND EXISTS (SELECT 1 FROM space child
                    JOIN credential a ON a.type = 'space-admin' AND a."resourceID" = child.id::text
                    WHERE child."parentSpaceId" = p.owner_space_id AND a."actorId" = c."actorId")`);
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "before", "note")
      SELECT 'credential-revoked', 'credential', c.id, to_jsonb(c), 'subspace admin issued for wrong target'
      FROM _rmr_subadmin_revokes rv JOIN credential c ON c.id = rv.credential_id`);
    await queryRunner.query(
      `DELETE FROM credential WHERE id IN (SELECT credential_id FROM _rmr_subadmin_revokes)`
    );

    // 4. parentCredentials of every role in the affected subtrees, from the ancestor chain.
    await queryRunner.query(`DROP TABLE IF EXISTS _rmr_parent_creds`);
    await queryRunner.query(`
      CREATE TEMP TABLE _rmr_parent_creds AS
      WITH RECURSIVE subtree AS (
        SELECT DISTINCT owner_space_id AS space_id FROM _rmr_pairs
        UNION
        SELECT s.id FROM space s JOIN subtree t ON s."parentSpaceId" = t.space_id
      ),
      chain AS (
        SELECT st.space_id, s."parentSpaceId" AS ancestor_id, 1 AS depth
        FROM subtree st JOIN space s ON s.id = st.space_id
        WHERE s."parentSpaceId" IS NOT NULL
        UNION ALL
        SELECT ch.space_id, a."parentSpaceId", ch.depth + 1
        FROM chain ch JOIN space a ON a.id = ch.ancestor_id
        WHERE a."parentSpaceId" IS NOT NULL
      ),
      expected AS (
        SELECT r.id AS role_id,
               coalesce(jsonb_agg(jsonb_build_object('type', ar.credential->>'type',
                                                     'resourceID', ch.ancestor_id::text)
                                  ORDER BY ch.depth)
                          FILTER (WHERE ar.id IS NOT NULL), '[]'::jsonb) AS creds
        FROM subtree st
        JOIN space s ON s.id = st.space_id
        JOIN community c ON c.id = s."communityId"
        JOIN role r ON r."roleSetId" = c."roleSetId"
        LEFT JOIN chain ch ON ch.space_id = st.space_id
        LEFT JOIN space anc ON anc.id = ch.ancestor_id
        LEFT JOIN community ac ON ac.id = anc."communityId"
        LEFT JOIN role ar ON ar."roleSetId" = ac."roleSetId" AND ar.name = r.name
        GROUP BY r.id
      )
      SELECT e.role_id, r."parentCredentials" AS old_creds, e.creds AS new_creds
      FROM expected e JOIN role r ON r.id = e.role_id
      WHERE r."parentCredentials" IS DISTINCT FROM e.creds`);
    await queryRunner.query(`
      INSERT INTO "${this.logTable}" ("action", "entity", "entityId", "before", "after")
      SELECT 'role-parent-credentials-fixed', 'role', role_id, old_creds, new_creds FROM _rmr_parent_creds`);
    await queryRunner.query(`
      UPDATE role r SET "parentCredentials" = p.new_creds, "updatedDate" = now(), version = r.version + 1
      FROM _rmr_parent_creds p WHERE p.role_id = r.id`);

    // 5. Verify.
    const [{ count: residual }] = await queryRunner.query(`
      SELECT count(*)::int AS count
      FROM space s JOIN community c ON c.id = s."communityId" JOIN role r ON r."roleSetId" = c."roleSetId"
      WHERE r.credential->>'type' LIKE 'space-%'
        AND r.credential->>'resourceID' IS DISTINCT FROM s.id::text`);
    if (residual !== 0) {
      throw new Error(
        `RepairMispointedSpaceRoleCredentials: ${residual} mis-pointed space roles remain`
      );
    }

    for (const t of [
      '_rmr_parent_creds',
      '_rmr_subadmin_revokes',
      '_rmr_subadmin_grants',
      '_rmr_revokes',
      '_rmr_grants',
      '_rmr_holders',
      '_rmr_pairs',
      '_rmr_roles',
    ]) {
      await queryRunner.query(`DROP TABLE ${t}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists: { reg: string | null }[] = await queryRunner.query(
      `SELECT to_regclass('"${this.logTable}"')::text AS reg`
    );
    if (!exists?.[0]?.reg) return;

    // Undo in reverse order of application.
    await queryRunner.query(`
      UPDATE role r SET "parentCredentials" = l."before", "updatedDate" = now(), version = r.version + 1
      FROM "${this.logTable}" l
      WHERE l."action" = 'role-parent-credentials-fixed' AND l."entityId" = r.id`);
    await queryRunner.query(`
      INSERT INTO credential (id, "createdDate", "updatedDate", version, "resourceID", type, issuer, expires, "actorId")
      SELECT (l."before"->>'id')::uuid, (l."before"->>'createdDate')::timestamptz,
             (l."before"->>'updatedDate')::timestamptz, (l."before"->>'version')::int,
             l."before"->>'resourceID', l."before"->>'type', (l."before"->>'issuer')::uuid,
             (l."before"->>'expires')::timestamp, (l."before"->>'actorId')::uuid
      FROM "${this.logTable}" l
      WHERE l."action" = 'credential-revoked'
        AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.id = l."entityId")`);
    await queryRunner.query(`
      DELETE FROM credential c USING "${this.logTable}" l
      WHERE l."action" = 'credential-granted' AND l."entityId" = c.id`);
    await queryRunner.query(`
      UPDATE role r SET credential = l."before", "updatedDate" = now(), version = r.version + 1
      FROM "${this.logTable}" l
      WHERE l."action" = 'role-credential-fixed' AND l."entityId" = r.id`);
    await queryRunner.query(`DROP TABLE "${this.logTable}"`);
  }
}
